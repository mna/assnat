/*jshint asi:true, trailing:true*/

var mongodb = require("mongodb"),
  noevil = require('see-no-evil'),
  mongoserver = new mongodb.Server(process.env.MONGO_HOST, parseInt(process.env.MONGO_PORT, 10)),
  db_connector = new mongodb.Db(process.env.MONGO_DB, mongoserver),
  db,
  updDep

function ensureConnected(cb) {
  var wrap = noevil({
    error: cb
  })

  if (!db) {
    db_connector.open(wrap(function(nul, theDb) {
      db = theDb
      console.log('connected, authenticating...')
      db.authenticate(process.env.MONGO_USER, process.env.MONGO_PWD, wrap(function(nul, ok) {
        console.log('ok? ' + ok)
        cb(null, db)
      }))
    }))
  } else {
    cb(null, db)
  }
}

module.exports.getAllDeputies = function(cb) {
  var wrap = noevil({
    error: cb
  })

  ensureConnected(wrap(function(nul, db) {
    db.collection('deputies', wrap(function(nul, depsColl) {
      depsColl.find().toArray(cb)
    }))
  }))
}

module.exports.getDeputy = function(depId, cb) {
  var wrap = noevil({
    error: cb
  })

  ensureConnected(wrap(function(nul, db) {
    db.collection('deputies', wrap(function(nul, depsColl) {
      depsColl.findOne({id: depId}, cb)
    }))
  }))
}

module.exports.insertDeputies = function(deps, cb) {
  var wrap = noevil({
    error: cb
  })

  if (deps && (typeof deps.length === 'undefined' || deps.length > 0)) {
    ensureConnected(wrap(function(nul, db) {
      db.collection('deputies', wrap(function(nul, depsColl) {
        if (typeof deps.length !== 'undefined') {
          console.log('Inserting ' + deps.length + ' deputies')
        } else {
          console.log('Inserting deputy ' + deps.lastName)
        }
        depsColl.insert(deps, {safe: true}, cb)
      }))
    }))
  } else {
    cb(null)
  }
}

module.exports.setInactive = function(deps, cb) {
  var wrap = noevil({
      error: cb
    })

  var iterate = function iterate(index) {
    if (index < deps.length) {
      updDep(deps[index].id, {isActive: false}, wrap(function(nul, ok) {
        iterate(index + 1)
      }))
    } else {
      // Done iterating
      cb(null)
    }
  }

  if (deps && deps.length) {
    iterate(0)
  } else {
    cb(null)
  }
}

module.exports.updateDeputy = updDep = function(depId, changes, cb) {
  var wrap = noevil({
    error: cb
  })

  if (depId && changes) {
    ensureConnected(wrap(function(nul, db) {
      db.collection('deputies', wrap(function(nul, depsColl) {
        depsColl.update({id: depId}, {$set: changes}, {safe: true}, cb)
      }))
    }))
  } else {
    cb(null)
  }
}

module.exports.end = function() {
  if (db) {
    console.log('closing db...')
    db.close()
  }
}

module.exports.getBusinessMeeting = function(id, cb) {
  var wrap = noevil({
    error: cb
  })

  ensureConnected(wrap(function(nul, db) {
    db.collection('meetings', wrap(function(nul, meetColl) {
      meetColl.findOne({id: id}, cb)
    }))
  }))
}

module.exports.insertBusinessMeeting = function(meet, cb) {
  var wrap = noevil({
    error: cb
  })

  ensureConnected(wrap(function(nul, db) {
    db.collection('meetings', wrap(function(nul, meetColl) {
      console.log('inserting meeting for ' + meet.id)
      meetColl.insert(meet, {safe: true}, cb)
    }))
  }))
}

module.exports.updateBusinessMeeting = function(meet, cb) {
  var wrap = noevil({
    error: cb
  })

  ensureConnected(wrap(function(nul, db) {
    db.collection('meetings', wrap(function(nul, meetColl) {
      meetColl.update({id: meet.id}, {$set: {status: meet.status}}, {safe: true}, cb)
    }))
  }))
}

module.exports.deleteBusiness = function(meetingId, cb) {
  var wrap = noevil({
    error: cb
  })

  if (meetingId) {
    ensureConnected(wrap(function(nul, db) {
      db.collection('interventions', wrap(function(nul, intColl) {
        console.log('deleting interventions for business ' + meetingId)
        intColl.remove({meetingId: meetingId}, {safe: true}, wrap(function(nul, nb) {
          console.log('deleted n interventions: ' + nb)
          cb(null, nb)
        }))
      }))
    }))
  } else {
    cb(null)
  }
}

module.exports.insertBusiness = function(biz, cb) {
  var wrap = noevil({
    error: cb
  })

  if (biz) {
    ensureConnected(wrap(function(nul, db) {
      db.collection('interventions', wrap(function(nul, intColl) {
        console.log('inserting n interventions: ' + biz.interventions.length)
        intColl.insert(biz.interventions, {safe: true}, cb)
      }))
    }))
  } else {
    cb(null)
  }
}
