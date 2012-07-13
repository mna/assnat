/*jshint asi:true, trailing:true*/

var db = require('./db'),
  noevil = require('see-no-evil')

module.exports.update = function(biz, cb) {
  var wrap = noevil({
    error: cb
  })

  var clearInterventions = function() {
    db.deleteBusiness(biz.meeting.id, wrap(insertInterventions))
  }

  var insertInterventions = function() {
    db.insertBusiness(biz, cb)
  }

  // Get the meeting for this business
  db.getBusinessMeeting(biz.meeting.id, wrap(function(nul, meet) {
    console.log('Database meeting status: ' + (meet && meet.status))
    if (meet && meet.status !== biz.meeting.status) {
      console.log('updating meeting to status: ' + biz.meeting.status)
      db.updateBusinessMeeting(biz.meeting, wrap(clearInterventions))
    } else if (!meet) {
      console.log('new meeting, inserting...')
      db.insertBusinessMeeting(biz.meeting, wrap(insertInterventions))
    } else {
      // Not a new meeting, status identical, do nothing
      cb(null)
    }
  }))
}
