/*jshint asi:true, trailing:true*/

var months = ['janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre']

function scrapeStatus($el, resObj) {
  var rxStatus = /^\s*Version\s+(.+?)\s*$/i,
    mtch,
    raw

  raw = $el.text()
  mtch = rxStatus.exec(raw)
  if (!mtch) {
    throw new Error('The status is not in the expected format: ' + raw)
  }
  resObj.meeting.status = mtch[1].trim()
}

function scrapeSession($el, resObj) {
  var rxSession = /^\s*(\d{1,3})\s*<sup>e<\/sup>\s*.+?(\d{1,2})\s*/,
    mtch,
    raw

  raw = $el.html()
  mtch = rxSession.exec(raw)
  if (!mtch) {
    throw new Error('The session is not in the expected format: ' + raw)
  }
  resObj.meeting.session = mtch[1] + '.' + mtch[2]
}

function scrapeDateId($el, resObj) {
  var rxDateAndId = /^\s*Le\s+(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\s+-\s+(?:Séance extraordinaire)?\s*Vol.\s*(\d{1,3})\s+N°\s*(\d{1,4})\s*$/i,
    mtch,
    raw

  raw = $el.text()
  mtch = rxDateAndId.exec(raw)
  if (!mtch) {
    throw new Error('The date and ID is not in the expected format: ' + raw)
  }
  
  resObj.meeting.day = mtch[1]
  
  resObj.meeting.date = new Date(parseInt(mtch[4], 10),
    months.indexOf(mtch[3]),
    parseInt(mtch[2], 10))

  resObj.meeting.id = mtch[5] + '.' + mtch[6]
}

module.exports.scrape = function(opts, resObj) {
  var steps = [scrapeStatus, scrapeSession, scrapeDateId],
    $ = this

  // Get the meeting information of the parliament business session (date, session, etc.)
  if (!resObj.meeting) {
    resObj.meeting = {
      url: opts.url,
      meetingType: "Assemblée" // Future-proof for when Commissions will be scraped
    }
  }

  $('h1').nextAll('h2').each(function(i, h2) {
    var $h2 = $(h2)

    // The first h2 is the status of the journal
    // The second h2 is the session ID (législature.session)
    // The third h2 is the date and ID of the parliament business (vol.no)
    if (steps[i]) {
      steps[i].call($, $h2, resObj)
    }
  })
}
