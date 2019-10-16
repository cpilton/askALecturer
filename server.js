const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
app.set('port', process.env.PORT || 3000);
server.listen(app.get('port'));
const bodyParser = require('body-parser');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const Firestore = require('@google-cloud/firestore');

//Set up express
app.use(express.static(__dirname + '/public'));

//Set up a sticky session to ensure real-time messages work over multiple instances
app.use(bodyParser.json());
app.use(
  session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    key: 'JSESSIONID',
    secret: 'callumpilton',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: false
    },
    saveUninitialized: true,
    resave: true
  })
);

// load  local authentication configuration and service credentials
let localAuth;
try {
    localAuth = require('./auth-local.json');
  console.log("App started");
  console.log("Loaded local Authentication");
} catch (e) {}

//Connect to the Natural Language API
const nlu = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
  authenticator: new IamAuthenticator({
    apikey: localAuth.services.nlu.apikey,
  }),
  url: localAuth.services.nlu.url,
});

//connect to the Firestore API
const db = new Firestore({
    projectId: 'ask-a-lecturer',
    keyFilename: './gae-local.json',
});

//The following pages are not authenticated

app.get('/', function (req, res) {
  req.session.originalUrl = '/';
  res.sendFile(__dirname + '/public/index.html');
});

// Connection function
io.on('connection', function (socket) {
  console.log('a user connected');
  // Each socket also fires a special disconnect event
  socket.on('disconnect', function () {
    console.log('a user disconnected');
  });
});

//Send string to NLU for analysis
app.post('/api/analyze', (req, res, next) => {
    const analyze = req.body;
    analyze.features = {
        'keywords': {},
        "emotion": {}
    };
    analyze.language = 'en';
    nlu.analyze(analyze, (err, results) => {
        if (err) {
            return next(err);
        }
        return res.json({
            query: req.body.query,
            results
        });
    });
});

//Show error page on 403
app.use(function (req, res) {
  res.status(403);
  if (req.accepts('html')) {
    res.sendFile(__dirname + '/public/err/403.html');
  }
});

//Show error page on 500
app.use(function (req, res) {
  res.status(500);
  if (req.accepts('html')) {
    res.sendFile(__dirname + '/public/err/500.html');
  }
});

//Show error page on 404
app.use(function (req, res) {
    res.status(500);
    if (req.accepts('html')) {
        res.sendFile(__dirname + '/public/err/404.html');
    }
});
