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

    { // POST REQUEST || POST A NEW TWEET
      method: 'POST',
      path: '/tweets',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var session = request.session.get("hapi_twitter_session");
          var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

          Auth.authenticated(request, function(result) {
            if (result.authenticated === false) {
              return reply('Please Login First');
            }
            
            var tweet = {};

            db.collection('users').findOne( {"_id": ObjectId(session.user_id)}, function(err, result){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              if (result) {
                tweet = {
                  "message" : request.payload.tweet.message,
                  "user_id" : ObjectId(session.user_id),
                  "username": result.username,
                  "date" : Date()
                }
                
                db.collection('tweets').insert(tweet, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })
              }
            })
          })
        },
        validate: {
          payload: {
            tweet: {
              message: Joi.string().max(140).required()
            }
          }
        }
      }
    },

    { // GET REQUEST || GET ONE TWEET BY ID
      method: 'GET',
      path: '/tweets/{id}',
      handler: function(request,reply) {
        var id = encodeURIComponent(request.params.id);
        var db = request.server.plugins['hapi-mongodb'].db;
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

        db.collection('tweets').findOne({"_id": ObjectId(id)}, function(err, tweet) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          if (tweet === null) {
            return reply('Tweet Does Not Exist');
          }
          if (tweet) {
            reply(tweet);
          }
        })
      }
    },

    { // DELETE REQUEST || DELETE TWEET BY ID
      method: 'DELETE',
      path: '/tweets/{id}',
      handler: function(request, reply) {
        var id = encodeURIComponent(request.params.id);
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var db = request.server.plugins['hapi-mongodb'].db;
        var session = request.session.get("hapi_twitter_session");

        //go to tweets collection and see who tweeted it
        db.collection('tweets').findOne({"_id": ObjectId(id)}, function(err, tweet) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          if (tweet === null) {
            return reply('Tweet Does Not Exist');
          }
          //if the tweet exists, take the user_id and find if theres a match in sessions collections
          if (tweet) {
            db.collection('sessions').findOne( {"user_id" : ObjectId(tweet.user_id)}, function(err, result) {
              if (err) {
                return reply('Internal MongoDB Error', err);
              }
              //if there's no match, not authorized
              if (result === null) {
                return reply({'authorized' : false})
              }
              //if there's a match, delete it
              if (result) {
                db.collection('tweets').remove({"_id": ObjectId(id)}, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })
              }
            })
          }
        })

      }
    },

    { // GET REQUEST || GET TWEETS BY USER
      method: 'GET',
      path: '/users/{username}/tweets',
      handler: function(request,reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);

        db.collection('users').findOne({"username": username}, function(err, result) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          if (result === null) {
            return reply('User Does Not Exist');
          }
          if (result) {
            db.collection('tweets').find({"user_id": result._id}).toArray(function(err, tweets) {
              if (err) {
                return reply('Internal MongoDB Error', err);
              }
              reply(tweets);
            })
          }
        })
      }
    },

    { // GET REQUEST || GET TWEET BY KEYWORD
      method: 'GET',
      path: '/tweets/search/{searchQuery}',
      handler: function (request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        db.collection('tweets').createIndex( { message: "text" } );
        var query = { $text: { $search: request.params.searchQuery } };

        db.collection('tweets').find(query).toArray(function(err,result){
          if (err) throw err;
          reply(result);
        })
      }
    },

    { // GET REQUEST || GET NUMBER OF TWEETS BY USER
      method: 'GET',
      path: '/tweets/{username}/count',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);

        db.collection('tweets').count({ "username" : username}, function(err, count) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          if (count) {
            return reply(count);
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