/*global describe, it, before, beforeEach, after, afterEach*/
/*jshint asi:true, trailing:true, evil:true*/

var expect = require('expect.js'),
  sinon = require('sinon'),
  fs = require('fs'),
  sut = require(process.env.COV ? '../lib-cov/deputies' : '../lib/deputies'),
  fname = __dirname + '/data/liste_deputes.html'

describe('deputies', function() {
  describe('.get', function() {

    it('should expose a get() method', function() {
      expect(sut.get).to.be.a('function')
    })

    it('should return an object with an array of deputies and a hash of parties', function(done) {
      this.timeout(10000)

      sut.get({load: fname, limit: 10}, function(err, vals) {
        if (err) { done(err) }

        expect(vals).to.be.an('object')
        expect(vals.deputies).to.be.an('array')
        expect(vals.parties).to.be.an('object')
        done()
      })
    })

    it('should return the cached array synchronously on second call if forceRefresh is false', function(done) {
      var after = false

      this.timeout(10000)

      sut.get({load: fname, limit: 10}, function(err, val1) {
        if (err) { done(err) }

        sut.get({load: fname, forceRefresh: false}, function(err, val2) {
          if (err) { done(err) }

          expect(after).to.not.be.ok()
          done()
        })
        after = true
      })
    })
  })

  describe('data', function() {
    var data

    before(function(done) {
      sut.get({forceRefresh: false, load: fname, limit: 10}, function(err, vals) {
        if (err) { done(err) }
        data = vals
        done()
      })
    })

    it('should contain array of deputies objects', function() {
      expect(data.deputies).to.be.an('array')
      expect(data.deputies.length).to.not.be(0)
      expect(data.deputies[0]).to.be.an('object')
    })

    describe('deputies', function() {
      it('should have the expected fields', function() {
        var dep = data.deputies[0]

        expect(dep).to.have.key('lastName')
        expect(dep).to.have.key('firstName')
        expect(dep).to.have.key('district')
        expect(dep).to.have.key('party')
        expect(dep).to.have.key('url')
        expect(dep).to.have.key('id')
        expect(dep).to.have.key('gender')
        expect(dep).to.have.key('title')
        expect(dep).to.have.key('picture')
      })
    })
  })
})
