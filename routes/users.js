var Bcrypt = require('bcrypt');
var Joi = require('joi');

exports.register = function(server, options, next) {
  
  //include routes
  server.route([
    //retrieve all users
    {
      method: 'GET',
      path: '/users',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;

        db.collection('users').find().toArray(function(err, users) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          reply(users);
        })
      }
    },

    //sign up new user
    {
      method: 'POST',
      path: '/users',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var newUser = request.payload.newUser;

          //encrypt with salt + hash/encryption
          Bcrypt.genSalt(10, function(err, salt){
            Bcrypt.hash(newUser.password, salt, function(err, hash){
              newUser.password = hash;

              //make sure its unique
              var uniqueUserQuery = { 
                $or: [
                  {username: newUser.username},
                  {email: newUser.email }
                ]
              };

              db.collection('users').count(uniqueUserQuery, function(err, userExist) {
                //if user does exist, reply an error
                if (userExist) {
                  return reply('Error: Username already exists', err);
                }
                //otherwise, create the user
                db.collection('users').insert(newUser, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })
              })
            })
          });
        },
        validate: {
          payload: {
            newUser: {
              username: Joi.string().min(3).max(20).required(),
              email: Joi.string().email().max(50).required(),
              password: Joi.string().min(5).max(20).required()
            }
          }
        }
      },
    }
  ])

  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'users-route',
  version: '0.0.1'
}