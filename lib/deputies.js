/*jshint asi:true, trailing:true*/

var noevil = require('see-no-evil'),
  url = require('url'),
  path = require('path'),
  Loader = require('./loader').Loader,
  Parser = require('./parser').Parser,
  db = require('./db'),
  exp,
  cache,
  keys = ['name', 'district', 'party', 'email'],
  indep = ['Indépendant', 'Indépendante'],
  INDEP_PARTY = 'ind.'

module.exports = exp = {}

/*
** Deputy object:
** - url : the absolute URL to the deputy's page on assnat
** - id : the unique identifier of the deputy (currently, the name_id part of the URL)
** - lastName : the deputy's last name
** - firstName : the deputy's first name
** - email : the publicly displayed email address of the deputy [optional]
** - district : the district of the deputy
** - party : the name of the party of the deputy (Indépendant if none)
** - title : M. or Mme
** - gender : m[ale] or f[emale]
** - picture : for now, the url of the picture [optional]
** - isActive : set to true
*/

/*
** Party object:
** - name : the name of the party
** - deputies : array of deputy IDs members of this party
*/

// Get data from the name cell
function scrapeNameCell(opts, index, $td, inst) {
  var rxId = /\/fr\/deputes\/([^\/]+)\//i,
    rxNames = /^([^,]+),\s(.+)$/,
    a,
    mtch,
    rawName

  // Special case in first cell: get url, id, last name and first name
  a = $td.children('a')
  
  // Get the URL
  inst.url = url.resolve(opts.url, a.attr('href'))

  // Get the ID from the URL
  mtch = rxId.exec(inst.url)
  if (!mtch) {
    throw new Error('The deputy url is not in the expected format: ' + inst.url)
  }
  inst.id = mtch[1]

  // Get the name
  rawName = a.text()
  mtch = rxNames.exec(rawName)
  if (!mtch) {
    throw new Error('The deputy name is not in the expected format: ' + rawName)
  }
  inst.lastName = mtch[1].trim()
  inst.firstName = mtch[2].trim()
}

// Get data from the email cell
function scrapeEmailCell(opts, index, $td, inst) {
  var rxEmail = /mailto:(\S+)/i,
    a,
    rawEmail,
    mtch

  // Special case: get the email (optional)
  a = $td.children('a')
  if (a.length > 0) {
    rawEmail = $td.children('a').attr('href')
    mtch = rxEmail.exec(rawEmail)
    if (!mtch) {
      throw new Error('The deputy email is not in the expected format: ' + rawEmail)
    }
    inst[keys[index]] = mtch[1]
  }
}

// Get data from a standard cell (content of the TD directly)
function scrapeStandardCell(opts, index, $td, inst) {
  // Standard cases, get the content of the cell
  inst[keys[index]] = $td.text().trim()
  if (keys[index] === 'party' && indep.indexOf(inst[keys[index]]) >= 0) {
    inst[keys[index]] = INDEP_PARTY
  }
}

// Get the complementary information from the deputy's page (gender and picture)
function scrapeComplementaryInfo(opts, inst, cb) {
  var wrap = noevil({
      error: cb
    }),
    loader = new Loader({
      load: opts.load,
      url: inst.url
    })

  // Transform file name before load
  loader.before('load', function() {
    if (this.options.load) {
      // Load the file in this directory, but using inst.id + '.html' as file name
      this.options.load = path.join(path.dirname(this.options.load), inst.id + '.html')
    }
  })

  // Load from file or from web
  loader.load(wrap(function() {
    // Source is in the last argument
    var args = Array.prototype.slice.call(arguments),
      parser = new Parser(opts),
      src

    src = args.pop()
    parser.before('parse', function() {
      if (this.options.save) {
        this.options.save = path.join(path.dirname(this.options.save), inst.id + '.html')
      }
    })
    parser.parse(src, wrap(function(nul, win) {
      var $ = win.$,
        rxGenre = /^Député(e)? /,
        raw,
        mtch,
        picRawUrl,
        picUrl

      // Get the picture URL
      picRawUrl = $('.photoDepute').attr('src')
      if (picRawUrl) {
        picUrl = url.parse(picRawUrl, true)
        // Modify the query string to get the small picture
        if (!picUrl.query.process) {
          throw new Error('The deputy picture URL is not in the expected format: ' + picRawUrl)
        }
        picUrl.query.process = 'small'
        picUrl.search = null // Ensure the query object is used by format

        inst.picture = url.format(picUrl)
      }

      // Get the title and gender
      raw = $('.enteteFicheDepute ul li').first().text()
      mtch = rxGenre.exec(raw)
      if (!mtch) {
        throw new Error('The deputy gender is not in the expected format: ' + raw)
      }
      inst.title = (mtch[1] && mtch[1] === 'e' ? 'Mme' : 'M.')
      inst.gender = (mtch[1] && mtch[1] === 'e' ? 'f' : 'm')

      cb(null, inst)
    }))
  }))
}

// Create a deputy object from an element (TR)
function createDeputy(opts, $, el, cb) {
  var inst = {isActive: true},
    $el = $(el),
    wrap = noevil({
      error: cb
    })

  $el.children('td').each(function(i, td) {
    var $td = $(td)

    if (i === 0) {
      // Name and ID cell
      scrapeNameCell(opts, i, $td, inst)

    } else if (i === 3) {
      // Email cell
      scrapeEmailCell(opts, i, $td, inst)

    } else {
      scrapeStandardCell(opts, i, $td, inst)
    }
  })

  db.getDeputy(inst.id, wrap(function(nul, dep) {
    if (!dep) {
      console.log('deputy does not exist, getting complementary info : ' + inst.id)
      // Get the genre of the deputy, and the picture
      scrapeComplementaryInfo(opts, inst, cb)
    } else {
      // Deputy exists, skip complementary info (picture and gender are unlikely to change!)
      inst.title = dep.title
      inst.gender = dep.gender
      inst.picture = dep.picture
      cb(null, inst)
    }
  }))
}

// Create a party, add the deputy to its deputies array
function addMissingParty(deputy, parties) {
  var party,
    pobj

  if (indep.indexOf(deputy.party) >= 0) {
    // Independent deputy
    party = INDEP_PARTY
  } else {
    party = deputy.party
  }

  if (!parties[party]) {
    // Create the party object and add to the array of parties
    pobj = {
      name: party,
      deputies: []
    }
    parties[party] = pobj
  } else {
    // Get the party object
    pobj = parties[party]
  }

  // Add this deputy ID to the party
  pobj.deputies.push(deputy.id)
}

/*
** get()
**
** Scrape the active deputies page and create the deputies and parties objects.
** Parms:
** - opts : an options hash that may specify the following fields:
**   * forceRefresh: boolean, if true, re-parse the page, do not use the cache
**   * save: if truthy, save the html page to this file
**   * load: if truthy and the file exists, load this file instead of the real URL
**   * limit: a maximum number of deputies to scrape (useful for tests)
**   * url: the web page to load for the list of active deputies
** - cb : the callback (error, vals)
*/
exp.get = function(opts, cb) {
  var wrap = noevil({
      error: cb
    }),
    loader = new Loader(opts)

  if (opts.forceRefresh || !cache) {
    // Deputies is an array of deputy objects, parties is a hash, keyed with the party name
    cache = {
      deputies: [],
      parties: {}
    }

    // Get the html source
    loader.load(wrap(function(){
      // Source is in the last argument
      var args = Array.prototype.slice.call(arguments),
        parser = new Parser(opts),
        src

      src = args.pop()
      parser.parse(src, wrap(function(nul, win) {
        var $ = win.$,
          depsEl = []

        var iterate = function(index) {
          if (index < depsEl.length) {
            createDeputy(opts, $, depsEl[index], wrap(function(nul, d){
              cache.deputies.push(d)
              // TODO : Parties (as first class entities) not required/useful right now
              //addMissingParty(d, cache.parties)
              iterate(index + 1)
            }))
          } else {
            cb(null, cache)
          }
        }

        // Get all rows in the #ListeDeputes table's body
        $('#ListeDeputes tbody>tr').each(function(i, el) {
          if (!opts.limit || depsEl.length < opts.limit) {
            depsEl.push(el)
          }
        })
        iterate(0)
      }))
    }))
  } else {
    cb(null, cache)
  }
}
