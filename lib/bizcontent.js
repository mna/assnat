/*jshint asi:true, trailing:true*/

var util = require('./util'),
  Intervention = require('./intervention').Intervention,
  Vote = require('./vote').Vote,
  PENDING_TIME_REWIND = (10 * 60000) // 10 minutes

// Return a date object indicating the time of the intervention
function parseTime(day, text) {
  var rxTime = /^\s*\(\s*(\d{1,2})\s*h\s*(\d{2})\s*\)\s*$/,
    rxHour = /^\s*\(\s*(\d{1,2})\s*heures?\s*\)\s*$/,
    mtch

  mtch = rxTime.exec(text)
  if (!mtch) {
    mtch = rxHour.exec(text)
  }
  if (mtch) {
    return new Date(day.getFullYear(),
      day.getMonth(),
      day.getDay(),
      parseInt(mtch[1], 10),
      parseInt((mtch[2] ? mtch[2] : '0'), 10))
  }
  return null
}

// Assign times to the interventions that don't have a time yet (before the first
// time marker is found)
function assignPendingTimes(ctx) {
  // Set the intervention without times to the current time minus constant
  var dt = new Date(ctx.time.getTime() - PENDING_TIME_REWIND)

  for (var i = 0; i < ctx.pendingTime.length; i++) {
    ctx.pendingTime[i].time = dt
  }

  // Empty the pending time array
  ctx.pendingTime.length = 0
}

function updateSubject(ctx, text, isTitle, resObj) {
  var rxValid = /^(?:M\.|Mme) .+?\s+.+$/,
    trimmed,
    subs = ['Mise aux voix', 'Document déposé', 'Adoption', 'Adoption du principe', 'Documents déposés'],
    votationSubIndex = 0

  if (!text) {
    return false
  }

  trimmed = util.cleanString(text)
  if (rxValid.test(trimmed)) {
    // This is a name of a deputy, ignore as subject/subtitle
    return false
  }

  // Otherwise, if it is a known subsection, ignore isTitle and set as subtitle
  if (!isTitle || subs.indexOf(trimmed) >= 0) {
    ctx.subject.subtitle = trimmed

    // If this is a votation subtitle, indicate votation section
    ctx.inVotationSection = (subs.indexOf(trimmed) === votationSubIndex)

    // Add to the list of subtitles
    if (resObj.subjects.subtitles.indexOf(trimmed) < 0) {
      resObj.subjects.subtitles.push(trimmed)
    }
  } else {
    ctx.subject.title = trimmed
    ctx.subject.subtitle = null
    ctx.inVotationSection = false

    // Add to the list of titles
    if (resObj.subjects.titles.indexOf(trimmed) < 0) {
      resObj.subjects.titles.push(trimmed)
    }
  }

  // Return truthy and the trimmed text
  return trimmed
}

function scrapeVotes(ctx, $el, resObj) {
  // For some reason, some spaces are instead ASCII(160), which is A0 in hex.
  var rxVotes = /(M\.|Mme)(?:\s|\xa0)(.+?)(?:\s|\xa0)\((.+?)\)(?:,\s+|\.)/g,
    rxSummary = /^(Pour|Contre|Abstentions):\s*(\d+)$/,
    mtch,
    matched,
    text

  // The votes are counted by a non-deputy
  if (ctx.inVotationSection && ctx.paragraph.isIntervention &&
    !util.isDeputySpeaker(ctx.speaker)) {

    // Loop through all matches for the votes
    text = ctx.paragraph.text
    while (mtch = rxVotes.exec(text)) {
      if (!ctx.vote) {
        var foo = new Vote(ctx)
      }
      // If this is a new speaker (meaning a new voting section) and the first match,
      // move the current pendings to their destination
      if (ctx.paragraph.isNewSpeaker && !matched) {
        // Move pendings to their final destination, either yays if it is empty,
        // or nays if yays is not empty
        ctx.vote.movePendings()
      }
      matched = true

      // Keep in the pendings array
      ctx.vote.add(mtch)
    }

    // If it was not a match, it wasn't a count of votes, but it may be a summary paragraph
    if (!matched) {
      // Check if this is a summary paragraph
      mtch = rxSummary.exec(text)
      if (mtch) {
        // Move pendings
        ctx.vote.movePendings()

        // Keep the official count
        ctx.vote.setCount(mtch[1].toLowerCase(), parseInt(mtch[2], 10))

        if (mtch[1].toLowerCase() === 'abstentions') {
          // Abstention is the last expected paragraph of a votation, save onto result object
          ctx.vote.end(ctx, resObj)
        }
      }
    }
  }
}

function scrapeIgnored(ctx, $el, resObj) {
  if (!ctx.paragraph.isIntervention && !ctx.paragraph.isSubject && !ctx.paragraph.isTimeMarker) {
    resObj.ignored.push($el.html())
    resObj.stats.ignored++
  }
}

function scrapeTimeMarker(ctx, $el, resObj) {
  var dt

  // If not an intervention nor a subject, maybe a time marker?
  if (!ctx.paragraph.isIntervention && !ctx.paragraph.isSubject && $el.is('i')) {
    // Time marker
    dt = parseTime(resObj.meeting.date, $el.text())
    if (dt) {
      ctx.paragraph.isTimeMarker = true
      ctx.time = dt
      assignPendingTimes(ctx)

      resObj.stats.timeMarkers++
    } else {
      // Not a time marker format, assume it is a suspension or end of the business, reset subject,
      // subtitle, time and speaker. Stop current intervention.
      ctx.subject.title = null
      ctx.subject.subtitle = null
      ctx.speaker = null
      ctx.time = null
      if (ctx.intervention) {
        ctx.intervention.end(ctx, resObj)
      }
    }
  }
}

function scrapeSubject(ctx, $el, resObj) {
  var $ = this

  // If this is not an intervention paragraph, it may be a new subject
  if (!ctx.paragraph.isIntervention && $el.is('b')) {
    $el.find('p[align="CENTER"]').each(function(i, p) {
      var $p = $(p),
        text = $p.children('a').text()

      if (i === 0) {
        // First paragraph is the subject or a subtitle in some cases (handled in updateSubject)
        if (updateSubject(ctx, text, true, resObj)) {
          ctx.paragraph.isSubject = true
        }
      } else if (i === 1) {
        // Second paragraph may be a subtitle, set only if there was a new subject
        if (ctx.paragraph.isSubject) {
          updateSubject(ctx, text, false, resObj)
        }
      } else {
        // Should not have more than 2 paragraphs
        console.log('Expected only 2 paragraphs in new subject title, found at least 3: ' + $el.html())
      }
    })
    if (ctx.paragraph.isSubject) {
      // Special case, if there's no current intervention, maybe the previous action was a
      // time marker that ended the intervention and cleared the speaker. If that's the case
      // do NOT start a new intervention.
      if (!ctx.intervention && !ctx.speaker) {
        // That's the special case, do nothing, keep going
      } else {
        // New subject ends previous intervention, if any
        if (ctx.intervention) {
          ctx.intervention.end(ctx, resObj)
        }
        // Start a new intervention in case the next paragraph is a continuation from same speaker.
        // If not, no problem, this empty intervention will be thrown away.
        ctx.intervention = new Intervention(ctx)
      }

      resObj.stats.titles++
    }
  }
}

function scrapeIntervention(ctx, $el, resObj) {
  var b

  if ($el.is('p[align="JUSTIFY"]')) {
    // Intervention paragraph, maybe a new intervention if starts with a bold
    ctx.paragraph.isIntervention = true

    if ((b = $el.children('b')) && b.length > 0) {
      // New speaker, end the previous intervention if any
      ctx.paragraph.isNewSpeaker = true
      if (ctx.intervention) {
        ctx.intervention.end(ctx, resObj)
      }

      // Keep trace of new speaker and start new intervention
      ctx.speaker = b.text()
      ctx.intervention = new Intervention(ctx)

      // Remove, so that the intervention's text does not contain the speaker's name
      b.remove()

      resObj.stats.newSpeakers++
    }

    // Add the text to the current intervention
    if (ctx.intervention) {
      ctx.paragraph.text = ctx.intervention.append($el.text())
      if (!ctx.paragraph.isNewSpeaker) {
        resObj.stats.sameSpeakers++
      }
    } else if (!ctx.paragraph.isNewSpeaker) {
      resObj.stats.ignored++
    }
  }
}

module.exports.scrape = function(ctx, resObj) {
  var $ = this,
    $content = $('contenu'),
    noop = function(){},
    steps = [scrapeIntervention, scrapeSubject, scrapeTimeMarker, ctx.skipVotes ? noop : scrapeVotes, scrapeIgnored]

  // Augment the context with content-specific information
  util.extend(ctx, {
    speaker: null,
    subject: {
      title: null,
      subtitle: null
    },
    time: null,
    intervention: null,
    pendingTime: [],
    lookupCache: {},
    inVotationSection: false,
    vote: null,
    paragraph: {
      isIntervention: false,
      isNewSpeaker: false,
      isSubject: false,
      isTimeMarker: false,
      text: null
    }
  })

  // Augment the result object
  util.extend(resObj, {
    interventions: [],
    ignored: [],
    subjects: {
      titles: [],
      subtitles: []
    },
    votes: [],
    stats: {
      paragraphs: 0,
      titles: 0,
      timeMarkers: 0,
      newSpeakers: 0,
      sameSpeakers: 0,
      ignored: 0
    }
  })

  // Loop through all content
  $content.children().each(function(indx, el) {
    var $el = $(el)

    resObj.stats.paragraphs++

    // Call the scraping steps
    for (var i = 0; i < steps.length; i++) {
      steps[i].call($, ctx, $el, resObj)
    }

    // Reset the paragraph context
    ctx.paragraph = {
      isIntervention: false,
      isNewSpeaker: false,
      isSubject: false,
      isTimeMarker: false
    }
  })
  resObj.stats.sum = resObj.stats.titles + resObj.stats.timeMarkers +
    resObj.stats.newSpeakers + resObj.stats.sameSpeakers + resObj.stats.ignored
}
