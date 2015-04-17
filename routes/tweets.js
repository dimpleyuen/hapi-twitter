var Joi = require('joi');
var Auth = require('./auth');

exports.register = function(server, options, next) {
  server.route([
    { // GET REQUEST || GET ALL TWEETS
      method: 'GET',
      path: '/tweets',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;

        db.collection('tweets').find().toArray(function(err, tweets) {
          if (err) {
            return reply('Internal MongoDB error', err);
          }
          reply(tweets);
        })
      }
    },

    { // GET REQUEST || GET TWEETS FROM ONE USER
      method: 'GET',
      path: '/users/{username}/tweets',
      handler: function(request,reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);

        db.collection('users').findOne({"username": username}, function(err, result) {
          if (err) {
            return reply('Internal MongoDB error', err);
          }
          if (result === null) {
            return reply('User Does Not Exist');
          }
          if (result) {
            //username refers to username found
            db.collection('tweets').find({"user_id": username._id}).toArray(function(err, tweets) {
              if (err) {
                return reply('Internal MongoDB error', err);
              }
              reply(tweets);
            })
          }
        })


      }
    }
  ])

  next();
};

exports.register.attributes = {
  name: 'tweets-route',
  version: '0.0.1'
};