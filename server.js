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

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
  limit: '20mb',
  extended: true
}))
app.use(bodyParser.json({
  limit: '20mb',
  extended: true
}))

app.use(bodyParser.json());
app.use(
  session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    key: 'JSESSIONID', // use a sticky session to make sockets work
    secret: 'callumpilton',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: false
    },
    saveUninitialized: true,
    resave: true
  })
);

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) {}

const nlu = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
  authenticator: new IamAuthenticator({
    apikey: vcapLocal.services.nlu.apikey,
  }),
  url: vcapLocal.services.nlu.url,
});

//The following pages are not authenticated

app.get('/', function (req, res) {
  req.session.originalUrl = '/';
  //res.sendFile(__dirname + '/views/launch.html');
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

app.post('/api/analyze', (req, res, next) => {
    const analyze = req.body;
    analyze.features = {
        'keywords': {},
        "emotion": {}
    }
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

app.use(function (req, res) {
  res.status(403);
  // respond with html page
  if (req.accepts('html')) {
    res.sendFile(__dirname + '/public/err/403.html');
  }
});

app.use(function (req, res) {
  res.status(500);
  // respond with html page
  if (req.accepts('html')) {
    res.sendFile(__dirname + '/public/err/500.html');
  }
});
