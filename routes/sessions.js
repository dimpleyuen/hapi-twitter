var Bcrypt = require('bcrypt');

exports.register = function(server, options, next) {
  
  server.route([
    { // POST REQUEST || CREATE A SESSION
      method: 'POST',
      path: '/sessions',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var user = request.payload.user;

        //find if username exists
        db.collection('users').findOne( {"username" : user.username}, function (err, userMongo) {
          if (err) {
            return reply('Internal MongoDB error', err);
          }

          if (userMongo === null) {
            return reply({"message": "User Does Not Exist"});
          }

          //if user is not null (eg. exists) compare password in payload vs password in mongo
          Bcrypt.compare(user.password, userMongo.password, function(err, match) {
            //if passwords match, authenticate user and add cookie
            if (match) {
              
              //function to generate a random key
              function randomKeyGenerator() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); }
              var randomKey = (randomKeyGenerator() + randomKeyGenerator() + "-" + randomKeyGenerator() + "-4" + randomKeyGenerator().substr(0,3) + "-" + randomKeyGenerator() + "-" + randomKeyGenerator() + randomKeyGenerator() + randomKeyGenerator()).toLowerCase();

              //create a new session
              var newSession = {
                "session_id" : randomKey,
                "user_id": userMongo._id
              }

              //insert new session (key & userid) into sessions collection
              db.collection('sessions').insert(newSession, function(err, writeResult) {
                if (err) {
                  return reply('Internal MongoDB error', err);
                }

                //if there is no error, store session info into browser cookie with yar
                //session name can be anything
                request.session.set('hapi_twitter_session', {
                  "session_key": randomKey,
                  "user_id": userMongo._id
                })
                //if there is no error, reply writeresult
                reply(writeResult);
              });

            //if passwords dont match
            } else {
              reply({"message": "Password Incorrect"});
            }
          })
        })
      }
    },

  ])

  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'sessions-route',
  version: '0.0.1'
}