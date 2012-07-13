/*jshint asi:true, trailing:true*/

/*
** Usage:
** var withAdvice = require('./advice')
** withAdvice.call(targetObject)
*/

// fn is a supporting object that implements around, before and after
var fn = {
  around: function(base, wrapped) {
    return function() {
      var args = Array.prototype.slice.call(arguments)

      // Around calls the new method, passing the original method as the first argument.
      // It is up to the new method to decide when to call the original.
      return wrapped.apply(this, [base.bind(this)].concat(args))
    }
  },
  before: function(base, before) {
    // Before uses "around" and calls the original method AFTER the new method, returning
    // the result of the original method.
    return fn.around(base, function() {
      var args = Array.prototype.slice.call(arguments),
        orig = args.shift()

      before.apply(this, args)
      return (orig).apply(this, args)
    })
  },
  after: function(base, after) {
    // After uses "around" and calls the original method BEFORE the new method, returning
    // the result of the original method.
    return fn.around(base, function() {
      var args = Array.prototype.slice.call(arguments),
        orig = args.shift(),
        res = orig.apply(this, args)

      after.apply(this, args)
      return res
    })
  },
  hijackBefore: function(base, hijack) {
    // Hijcak before calls the hijack method, intercepts the callback, and calls the
    // base method. It basically chains the methods in this order: hijack->base->originalCb.
    // If the hijack method returns an error as first argument, the base method is skipped
    // and the error is sent to the original callback.
    return function() {
      var args = Array.prototype.slice.call(arguments),
        origCb = args.pop(),
        self = this

      hijack.apply(this, args.concat(function(er) {
        if (er) {
          origCb(er)
        } else {
          base.apply(self, args.concat(origCb))
        }
      }))
    }
  },
  hijackAfter: function(base, hijack) {
    // Hijcak after calls the base method, hijacks the callback parameter by passing a private method
    // as callback, then calls the new method with the arguments provided by the original, adding
    // the original callback as last argument.
    return function() {
      var args = Array.prototype.slice.call(arguments),
        origCb = args.pop(),
        res,
        self = this

      res = base.apply(this, args.concat(function() {
        var argscb = Array.prototype.slice.call(arguments)
        // On callback, call the hijack method, passing the original callback as last argument
        hijack.apply(self, argscb.concat(origCb))
      }))
      return res
    }
  }
}

// mixin augments target object with around, before and after methods
// method is the base method, advice is the augmenting function
module.exports = function() {
  ['before', 'after', 'around', 'hijackAfter'].forEach(function(m) {
    this[m] = function(method, advice) {
      if (typeof this[method] === 'function') {
        return this[method] = fn[m](this[method], advice)
      } else {
        return this[method] = advice
      }
    }
  }, this)
}
