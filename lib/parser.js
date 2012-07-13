/*jshint asi:true, trailing:true*/

var jsdom = require('jsdom'),
  fs = require('fs'),
  path = require('path'),
  withAdvice = require('./advice'),
  Parser,
  noop = function() {},
  jquery = fs.readFileSync(path.resolve(__dirname, '../vendor/jquery-1.7.2.min.js'), 'utf8')

module.exports.Parser = Parser = function(opts) {
  this.options = opts

  if (opts.save) {
    this.before('parse', function(src) {
      fs.writeFile(this.options.save, src, noop)
    })
  }
}

Parser.prototype.parse = function(src, cb) {
  jsdom.env({
    html: src,
    src: [jquery],
    done: cb
  })
}

// Add the advice mixin
withAdvice.call(Parser.prototype)
