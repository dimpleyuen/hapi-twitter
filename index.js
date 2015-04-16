var Hapi = require('hapi');
var server = new Hapi.Server();

server.connection({
  host: '0.0.0.0',
  port: process.env.PORT || 3000, //process bit is for heroku deployment
  routes: {
    cors: true
  }
});

var plugins = [
  { register: require('./routes/users.js') },
  { register: require('./routes/sessions.js') },
  { register: require('hapi-mongodb'),
    options: {
      "url" : "mongodb://127.0.0.1:27017/hapi-twitter",
      "settings" : {
        "db" : {
          "native-parser": false
        }
      }
    }
  },
  { register: require('yar'),
    options: {
      cookieOptions: {
        password: 'password',
        isSecure: false //means you can use it without https
      }
    }
  }
];

server.register(plugins, function(err) {
  if (err) { 
    throw err;
  }

  server.start(function() {
    console.log('info', 'Server running at: ' + server.info.uri);
  })
});