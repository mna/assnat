/*jshint asi:true, trailing:true*/

var util = require('./util'),
  Vote

module.exports.Vote = Vote = function(ctx) {
  if (!ctx || !ctx.subject || !ctx.subject.title) {
    throw new Error('Cannot start a vote without a subject.')
  }

  util.extend(this, {
    subject: ctx.subject.title,
    yays: [],
    nays: [],
    abstentions: [],
    pendings: []
  })

  // Set as current vote
  ctx.vote = this
}

Vote.prototype.movePendings = function() {
  if (this.pendings.length) {
    if (!this.yays.length) {
      this.yays = this.pendings.slice(0)
    } else if (!this.nays.length) {
      this.nays = this.pendings.slice(0)
    } else if (!this.abstentions.length) {
      this.abstentions = this.pendings.slice(0)
    } else {
      // Error, all sections are filled!
      throw new Error('All three types of votes are filled: ' + this.subject)
    }

    // Clear pendings
    this.pendings.length = 0
  }
}

Vote.prototype.setCount = function(cntType, cnt) {
  var switchCnt = {
    'pour': 'yayCount',
    'contre': 'nayCount',
    'abstentions': 'abstentionCount'
  },
  switchAr = {
    'pour': 'yays',
    'contre': 'nays',
    'abstentions': 'abstentions'
  }
  this[switchCnt[cntType]] = cnt
  if (cnt !== this[switchAr[cntType]].length) {
    throw new Error('Expected ' + cnt + ' ' + switchAr[cntType] + ', found ' + this[switchAr[cntType]].length)
  }
}

Vote.prototype.add = function(mtch) {
  if (mtch[1] && mtch[2] && mtch[3]) {
    this.pendings.push(mtch[1] + ' ' + mtch[2] + ' - ' + mtch[3])
  }
}

Vote.prototype.end = function(ctx, resObj) {
  delete this.pendings
  resObj.votes.push(this)
  ctx.vote = null
}
