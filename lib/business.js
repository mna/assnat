/*jshint asi:true, trailing:true*/

var noevil = require('see-no-evil'),
  Loader = require('./loader').Loader,
  Parser = require('./parser').Parser,
  meeting = require('./bizmeeting'),
  content = require('./bizcontent'),
  exp

/*
** Meeting object:
** - status : the status of the parliament business day ("Préliminaire", "Finale" is definitive)
** - session : the parliament session (LL.SS : législative.session)
** - day : the day of the week of the business, in French
** - date : the date of the business
** - id : the ID of the business day, in Vol.No format
*/

/*
** Intervention object:
** - subject : the subject of the intervention
** - subtitle : the subtitle of the intervention
** - speaker : the speaker as written in the log
** - time : the approximate time of the intervention (date object)
** - text : the text of the intervention
** - deputyId : the ID of the deputy object corresponding to the speaker
** - meetingId : the Id of the meeting object of the business day
** - district : the district of the deputy at the moment of the intervention
** - party : the party name of the deputy at the moment of the intervention
** - id : unique identifier of the intervention
** - prevId : the ID of the previous intervention
** - nextId : the ID of the next intervention
*/
module.exports = exp = {}

// The source HTML has some recurring problems of unbalanced tags, so this fixes it before scraping.
function fixTags(er, res, body, cb) {
  var rxBug = /<p align="JUSTIFY"(?: \/)?>(((?!<p(?:\s|>)).)*?)<font size="2">»<p \/><\/font><p align="JUSTIFY">/gi,
    fixed

  if (er) {
    cb(er)
  } else {
    // Replace the buggy part
    fixed = body.replace(rxBug, function(str, p1) {
      return '<p align="JUSTIFY">' + p1 + '<font size="2">»</font></p><p align="JUSTIFY">'
    })

    cb(null, fixed)
  }
}

/*
** get()
**
** Parses a parliament business day, and returns an object containing the array of interventions,
** and an array of ignored paragraphs.
**
** Parms:
** - opts : the options hash, which may contain:
**   * url : the url of the web page to scrape (optional if load is specified, required otherwise)
**   * load : if truthy, the file name to load instead of the web page
**   * save : if truthy, the name of the file to which the web page's content will be saved
** - cb : the callback function (error, vals)
*/
exp.get = function(opts, cb) {
  var wrap = noevil({
      error: cb
    }),
    loader = new Loader(opts)

  // Hijack to fix the tags
  loader.hijackAfter('webLoad', fixTags)
  loader.load(wrap(function(){
    // Source is in the last argument
    var args = Array.prototype.slice.call(arguments),
      parser = new Parser(opts),
      src

    src = args.pop()
    parser.parse(src, wrap(function(nul, win) {
      var $ = win.$,
        resObj = {}

      try {
        // Get the meeting information
        meeting.scrape.call($, opts, resObj)

        // Get all the interventions
        content.scrape.call($, opts, resObj)

        // Return
        cb(null, resObj)
      } catch(e) {
        cb(e)
      }
    }))
  }))
}
