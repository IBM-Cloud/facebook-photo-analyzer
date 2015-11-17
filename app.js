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
  temp = require('temp')
  fs = require("fs"),
  path = require("path"),
  os = require("os");

temp.track();

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

var alchemyCreds = getServiceCreds(appEnv, "alchemy-api-photo-analyzer");
var alchemy = new AlchemyApi(alchemyCreds.apikey);

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

console.log(process.env.FACEBOOK_APP_ID);
if (process.env.FACEBOOK_APP_ID !== undefined && process.env.FACEBOOK_APP_SECRET !== undefined) {
  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:6020/auth/facebook/callback",
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
          });
          //async.each(photos.data, analyzePhoto, next);
          analyzePhoto(photos.data[0], next);
        }
        ], function (error, result) {
          if (error) {
            console.log(error);
            done(error);
          }
          else {
            done(null, {profile: profile, result: result});
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
});

function analyzePhoto(photo, callback) {
  var graph = photo.graph,
    file = path.join(os.tmpdir(), photo.id + ".jpg"),
    response = {
      id: photo.id
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
      response.sentiment = result.docSentiment;
      next(null, response);
    }
  ], callback);
}

app.get('/', function (request, response) {
  var opts = {
    user: request.user
  }
  response.render('index', opts);
});

app.get('/logout', function (request, response) {
  request.logout();
  response.redirect('/');
});

