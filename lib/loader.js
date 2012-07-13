/*jshint asi:true, trailing:true*/

var fs = require('fs'),
  path = require('path'),
  request = require('request'),
  withAdvice = require('./advice'),
  Loader

module.exports.Loader = Loader = function(opts) {
  this.options = opts
}

Loader.prototype.load = function(cb) {
  if (this.options.load && path.existsSync(this.options.load)) {
    this.fileLoad(this.options.load, cb)
  } else {
    this.webLoad(this.options.url, cb)
  }
}

Loader.prototype.fileLoad = function(file, cb) {
  //console.log('loading from ' + file)
  fs.readFile(file, 'utf8', cb)
}

Loader.prototype.webLoad = function(url, cb) {
  console.log('loading from ' + url)
  request(url, cb)
}

withAdvice.call(Loader.prototype)
