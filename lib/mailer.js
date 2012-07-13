/*jshint asi:true, trailing:true*/

var client = require('mailer'),
  util = require('./util'),
  utilNode = require('util'),
  host = process.env.EMAIL_DOMAIN,
  port = process.env.EMAIL_PORT,
  fromDomain = process.env.EMAIL_FROM_DOMAIN,
  fromEmail = process.env.EMAIL_FROM_EMAIL

module.exports = function(er, resObj) {
  var cb = function(err, res) {
      if(err) {
        console.log("Error:")
        console.dir(err)
      }
    }, obj

  if (!er) {
    obj = util.extend({},
      resObj.meeting, {
        interventionCount: resObj.interventions.length,
        ignoredCount: resObj.ignored.length
      }, resObj.stats)

    obj.subjects = resObj.subjects.titles.join("</li><li>")
      
    if (process.env.EMAIL_TO_EMAIL) {

      client.send({
        host: host,
        port: port,
        domain: fromDomain,
        to: process.env.EMAIL_TO_EMAIL,
        from: fromEmail,
        subject: 'assnat loader success ' + process.argv[2],
        template: __dirname + '/email.txt',
        data: obj,
        authentication: "login",
        username: process.env.EMAIL_USER,
        password: process.env.EMAIL_PWD
      }, cb)
    }
  } else {
    // Send the error
    if (process.env.EMAIL_TO_EMAIL) {

      client.send({
        host: host,
        port: port,
        domain: fromDomain,
        to: process.env.EMAIL_TO_EMAIL,
        from: fromEmail,
        subject: 'assnat loader error ' + process.argv[2],
        body: utilNode.inspect(er),
        authentication: "login",
        username: process.env.EMAIL_USER,
        password: process.env.EMAIL_PWD
      }, cb)
    }
  }
}
