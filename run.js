/*jshint asi:true, trailing:true*/

var dep = require('./lib/deputies'),
  biz = require('./lib/business'),
  upd = require('./lib/updatedeputy'),
  upbiz = require('./lib/updatebusiness'),
  db = require('./lib/db'),
  fs = require('fs'),
  util = require('util'),
  mailer = require('./lib/mailer'),
  wrap = require('see-no-evil')({
    error: manageError
  }),
  bizUrl

function manageError(err) {
  console.log('Error:')
  console.dir(err)
  terminate(err)
}

function terminate(er, bizs) {
  db.end()
  if (!er) {
    mailer(null, bizs)
    console.log('done')
  } else {
    mailer(er, bizs)
    console.log('done with error')
  }
}

if (process.argv.length > 2 && process.argv[2]) {
  bizUrl = process.argv[2]
  console.log('Loading business day at URL ' + bizUrl)

  dep.get({
      url: 'http://www.assnat.qc.ca/fr/deputes/index.html',
      forceRefresh: false,
      //save: __dirname + '/test/data/liste_deputes.html',
      //load: __dirname + '/test/data/liste_deputes.html'
    }, wrap(function(nul, vals) {
    // Save the output
    fs.writeFile(__dirname + '/test/data/deputes_out.js', util.inspect(vals), function(){})

    // Update the database
    upd.update(vals.deputies, wrap(function(nul){
      console.log('done updating deputies.')

      vals.url = bizUrl
      vals.skipVotes = true
      //vals.save = __dirname + '/test/data/biz-20120615.html'
      //vals.load = __dirname + '/test/data/biz-20120615.html'
      biz.get(vals, wrap(function(nul, bizs) {
        // Save the output
        fs.writeFile(__dirname + '/test/data/biz_out.js', util.inspect(bizs), function(){})

        // Update to the database
        upbiz.update(bizs, wrap(function(nul, ok) {
          terminate(null, bizs)
        }))
      }))
    }))
  }))
} else {
  console.log('No business day URL was provided. Will terminate.')
}
