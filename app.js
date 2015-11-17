var express = require('express'),
  app = express(),
  config = require("./config")(),
  passport = require('passport'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  methodOverride = require('method-override'),
  watson = require('watson-developer-cloud'),
  FacebookStrategy = require('passport-facebook').Strategy,
  _ = require("underscore"),
  cfenv = require("cfenv"),
  async = require("async"),
  graph = require('fbgraph'),
  request = require('request'),
  AlchemyApi = require('alchemy-api'),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  Cloudant = require('cloudant');

//---Deployment Tracker---------------------------------------------------------
require("cf-deployment-tracker-client").track();


//---Environment Vars-----------------------------------------------------------
var vcapLocal = null
try {
  vcapLocal = require("./vcap-local.json")
}
catch (e) {}

var appEnvOpts = vcapLocal ? {vcap:vcapLocal} : {}
var appEnv = cfenv.getAppEnv(appEnvOpts);

// Retrieves service credentials for the input service
function getServiceCreds(appEnv, serviceName) {
  var serviceCreds = appEnv.getServiceCreds(serviceName)
  if (!serviceCreds) {
    console.log("service " + serviceName + " not bound to this application");
    return null;
  }
  return serviceCreds;
}

//---Set up Watson Personality Insights-----------------------------------------
var visualRecognitionCreds = getServiceCreds(appEnv, "visual-recognition-photo-analyzer");
visualRecognitionCreds.version = "v1";
delete visualRecognitionCreds.url;
var visualRecognition = watson.visual_recognition(visualRecognitionCreds);

var alchemy = new AlchemyApi(process.env.ALCHEMY_API_KEY);

var cloudantCreds = getServiceCreds(appEnv, "cloudant-photo-analyzer"),
  dbName = "photo-analyzer",
  cloudant,
  db;

//---Routers and View Engine----------------------------------------------------
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({
  secret: 'keyboard cat'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

//---auth stuff-----------------------------------------------------------------
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

if (process.env.FACEBOOK_APP_ID !== undefined && process.env.FACEBOOK_APP_SECRET !== undefined) {

  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: appEnv.url + "/auth/facebook/callback",
      scope: ["user_photos", "user_posts"]
    },
    function(accessToken, refreshToken, profile, done) {
      async.waterfall([
        function  (next) {
          graph.setAccessToken(accessToken);
          graph.get("/me/photos", next);
        },
        function (photos, next) {
          var params = { fields: "images" };
          _.each(photos.data, function(photo) {
            photo.graph = graph;
            photo.userId = profile.id;
          });
          async.each(photos.data, analyzePhoto, next);
          //analyzePhoto(photos.data[0], next);
        }
        ], function (error, result) {
          if (error) {
            console.log(error);
            done(error);
          }
          else {
            done(null, profile);
          }
        }
      );
    }
  ));
}

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

app.listen(appEnv.port, function() {
  console.log("server started on port " + appEnv.port);
  var dbCreated = false;
  Cloudant({account:cloudantCreds.username, password:cloudantCreds.password}, function(er, dbInstance) {
      cloudant = dbInstance;
      if (er) {
          return console.log('Error connecting to Cloudant account %s: %s', me, er.message);
      }

      console.log('Connected to cloudant');
      cloudant.ping(function(er, reply) {
          if (er) {
              return console.log('Failed to ping Cloudant. Did the network just go down?');
          }

          console.log('Server version = %s', reply.version);
          console.log('I am %s and my roles are %j', reply.userCtx.name, reply.userCtx.roles);

          cloudant.db.list(function(er, all_dbs) {
              if (er) {
                  return console.log('Error listing databases: %s', er.message);
              }

              console.log('All my databases: %s', all_dbs.join(', '));

              _.each(all_dbs, function(name) {
                  if (name === dbName) {
                      dbCreated = true;
                  }
              });
              if (dbCreated === false) {
                  cloudant.db.create(dbName, seedDB);
              }
              else {
                  db = cloudant.db.use(dbName);
                  console.log("DB", dbName, "is already created");
              }
          });
      });
  });
});

function analyzePhoto(photo, callback) {
  var graph = photo.graph,
    file = path.join(os.tmpdir(), photo.id + ".jpg"),
    response = {
      photoId: photo.id,
      userId: photo.userId
    };

  async.waterfall([
    function (next) {
      var params = { fields: "images" };
      graph.get("/" + photo.id, params, next);
    },
    function (result, next) {
      response.source = result.images[0].source;
      var stream = request.get(result.images[0].source).pipe(fs.createWriteStream(file));
      stream.on("finish", function() {
        var params = {
          // From file
          image_file: fs.createReadStream(file)
        };

        visualRecognition.recognize(params, function (error, result) {
          if (error) {
            console.log(error);
            callback(null);
            return;
          }
          next(null, result)
        });
      });
    },
    function (result, next) {
      response.labels = result.images[0].labels;
      graph.get("/" + photo.id + "/comments", next);
    },
    function (comments, next) {
      var commentsString = "";

      _.each(comments.data, function(comment) {
        commentsString += " " + comment.message
      });

      if (commentsString != "") {
        alchemy.sentiment(commentsString, {}, next);
      }
      else {
        next(null, null);
      }

    },
    function (result, next) {
      if (result !== null) {
        response.sentiment = result.docSentiment;
      }

      response.type = "photo";
      db.view("photos", "photo", { keys: [response.photoId]}, next);
    },
    function (result, headers, next) {
        if (result.rows.length === 0) {
            db.insert(response, next);
        }
        else {
          next(null, result);
        }
    }
  ], callback);
}

app.get('/', function (request, response) {
  var setup = false;
  if (process.env.FACEBOOK_APP_ID !== undefined && process.env.FACEBOOK_APP_SECRET !== undefined && process.env.ALCHEMY_API_KEY !== undefined) {
    setup = true;
  }
  var opts = {
    user: request.user,
    setup: setup
  };

  if (request.user) {
    db.view("photos", "user", { keys: [request.user.id]}, function (error, result) {
      opts.photos = result.rows;
      response.render('index', opts);
    });
  }
  else {
    response.render('index', opts);
  }

});

app.get('/logout', function (request, response) {
  request.logout();
  response.redirect('/');
});

function seedDB(callback) {
  db = cloudant.use(dbName);

  async.waterfall([
      function (next) {
          var designDocs = [
              {
                  _id: '_design/photos',
                  views: {
                      all: {
                          map: function (doc) { if (doc.type === 'photo') { emit(doc._id, doc); } }
                      },
                      user: {
                          map: function (doc) { if (doc.type === 'photo') { emit(doc.userId, doc); } }
                      },
                      photo: {
                          map: function (doc) { if (doc.type === 'photo') { emit(doc.photoId, doc); } }
                      }
                  }
              }
         ];

          async.each(designDocs, db.insert, next);
      },
      function (next) {
          console.log("Created DB", dbName, "and populated it with initial purchases");
          next();
      }
  ], callback)
}
