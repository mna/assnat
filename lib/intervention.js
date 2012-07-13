/*jshint asi:true, trailing:true*/

var util = require('./util'),
  Intervention,
  seqId = 0

// Finds the deputy corresponding to the intervention's speaker text
// (usually in the format 'M. LastName:', but may be 'Mme LastName (District):' if
// more than one deputy has the same gender and last name).
// The lookup cache is used for a quick reference in the form key=speaker raw text,
// value=deputy object, since the same names usually come back many times.
function findDeputy(rawName, deps, lookupCache) {
  var mtch,
    title,
    name,
    district

  if (!rawName || !deps || !deps.length) {
    return null
  }

  mtch = util.isDeputySpeaker(rawName)
  if (mtch) {
    title = mtch[1]
    name = mtch[2]
    district = mtch[3]

    if (lookupCache[rawName]) {
      return lookupCache[rawName]
    } else {
      // Find all matching deputies, so that we can throw an error if there is more than one
      mtch = deps.filter(function(val) {
        return (val.title === title) && (val.lastName === name) && (!district || val.district === district)
      })
      if (mtch.length === 0) {
        throw new Error('Could not find deputy named ' + name + ' (' + district + ')')
      } else if (mtch.length > 1) {
        throw new Error('Found more than one match for deputy named ' + name + ' (' + district + ')')
      } else {
        // Found the one, keep it in the cache
        lookupCache[rawName] = mtch[0]
      }
    }

    return mtch[0]
  }
  // Not a deputy name (probably a parliament official like Président or Secrétaire)
  return null
}

module.exports.Intervention = Intervention = function(ctx) {
  if (!ctx || !ctx.speaker) {
    throw new Error('Cannot start an intervention without a speaker. Current subject: ' + ctx.subject.title + '/' + ctx.subject.subtitle)
  }

  // Initialize intervention
  util.extend(this, {
    subject: ctx.subject.title || '',
    speaker: ctx.speaker,
    subtitle: ctx.subject.subtitle || '',
    time: ctx.time,
    text: ''
  })

  // If there's no time yet, add to the pending time array
  if (!this.time) {
    ctx.pendingTime.push(this)
  }

  // Set as current intervention
  ctx.intervention = this
}

Intervention.prototype.end = function(ctx, resObj) {
  var dep

  if (this.text) {
    // Get the deputy object
    dep = findDeputy(this.speaker, ctx.deputies, ctx.lookupCache)
    if (dep) {
      this.deputyId = dep.id
      this.district = dep.district
      this.party = dep.party
    }
    this.meetingId = resObj.meeting.id
    this.id = this.meetingId + '.' + (++seqId)

    // Set the next intervention of the previous intervention (if any)
    if (ctx.prevIntervention) {
      // Set the previous intervention of this new intervention (if any)
      this.prevId = ctx.prevIntervention.id
      ctx.prevIntervention.nextId = this.id
    }

    resObj.interventions.push(this)
    ctx.intervention = null
    ctx.prevIntervention = this
  }
}

Intervention.prototype.append = function(text) {
  var trimmed

  // Append only if the trimmed text is not empty
  trimmed = util.cleanString(text)
  if (!trimmed) {
    return false
  }

  // Add new lines to separate paragraphs
  if (this.text) {
    this.text += '\n\n'
  }

  this.text += trimmed
  return trimmed
}
