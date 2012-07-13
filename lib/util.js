/*jshint asi:true, trailing:true*/

// Underscore-like extend object
module.exports.extend = function(obj) {
  var args = Array.prototype.slice.call(arguments, 1)
  
  args.forEach(function(source) {
    for (var prop in source) {
      obj[prop] = source[prop]
    }
  })
  return obj
}

// Trim whitespaces and replace tabs and newlines inside the string with a space
module.exports.cleanString = function(text) {
  if (!text) {
    return text
  }

  return text.replace(/[\n\t\r]/g, ' ').trim()
}

// Indicates if the specified intervention speaker text represents a deputy
// (starting with M. or Mme) or not (a parliament official - i.e. Président or Secrétaire adjoint)
module.exports.isDeputySpeaker = function(rawName) {
  var rxDepName = /^(M\.|Mme) (.+?)(?: \((.+?)\))?:$/,
    mtchBase,
    mtchDistrict,
    rxPresComm = /^présidente? .+$/

  mtchBase = rxDepName.exec(rawName)
  if (mtchBase) {
    // Check if it's not a deputy acting as a president of a commission
    // (format: "M. Gendron (président de la commission plénière):", see 2012-06-12)
    mtchDistrict = rxPresComm.exec(mtchBase[3])
    if (mtchDistrict) {
      // Is a president of some commission, so not a deputy speaker
      mtchBase = false
    }
  }
  return mtchBase
}
