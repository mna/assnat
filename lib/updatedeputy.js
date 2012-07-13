/*jshint asi:true, trailing:true*/

var db = require('./db'),
  noevil = require('see-no-evil')

function getMatchingDeputy(depsAr, id) {
  var exists = false

  for (var i = 0; i < depsAr.length; i++) {
    if (id === depsAr[i].id) {
      exists = depsAr[i]
      break
    }
  }

  return exists
}

function getMissingDeputies(depsFilter, depsRef) {
  var miss = []

  depsFilter.forEach(function(val) {
    if (!getMatchingDeputy(depsRef, val.id)) {
      miss.push(val)
    }
  })

  return miss
}

function getModifiedDeputies(depsAr, dbDeps) {
  var found,
    changes = {}

  depsAr.forEach(function(val) {
    var update = null

    found = getMatchingDeputy(dbDeps, val.id)
    if (found) {
      // Check for changes in the district, party or email
      if (val.district !== found.district) {
        update = {}
        update.district = val.district
      }
      if (val.party !== found.party) {
        update = update || {}
        update.party = val.party
      }
      if (val.email !== found.email) {
        update = update || {}
        update.email = val.email
      }
      if (update) {
        changes[val.id] = update
      }
    }
  })

  return changes
}

module.exports.update = function(deps, cb) {
  var wrap = noevil({
    error: cb
  })

  // Get all deputies from the database
  db.getAllDeputies(wrap(function(nul, dbDeps) {
    var newDeps,
      inactives

    console.log('Database deputy count: ' + dbDeps.length)
    newDeps = getMissingDeputies(deps, dbDeps)
    db.insertDeputies(newDeps, wrap(function(nul, ok) {
      inactives = getMissingDeputies(dbDeps, deps)
      db.setInactive(inactives, wrap(function(nul, ok) {
        var changes,
          ids = []

        var iterate = function iterate(index) {
          if (index < ids.length) {
            console.log('updating deputy ' + ids[index])
            db.updateDeputy(ids[index], changes[ids[index]], wrap(function(nul, ok) {
              iterate(index + 1)
            }))
          } else {
            // Done iterating
            cb(null)
          }
        }

        // Get changes for all existing and active deputies
        changes = getModifiedDeputies(deps, dbDeps)
        for (var key in changes) {
          ids.push(key)
        }
        iterate(0)
      }))
    }))
  }))
}
