// Initialise the express module
const express = require('express');
const app = express();

// Initialise the http module
const server = require('http').Server(app);

// Initialise the socket.io module
const io = require('socket.io')(server);

// Initialise the express-session module
const session = require('express-session');

// Initialise the memorystore module
const MemoryStore = require('memorystore')(session);

// Initialise the body-parser module
const bodyParser = require('body-parser');

// Initialise the ibm-watson natural-language-understanding module
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');

// Initialise the ibm-watson auth module
const { IamAuthenticator } = require('ibm-watson/auth');

// Initialise the google-cloud firestore module
const Firestore = require('@google-cloud/firestore');

// Start the app on port 3000 in development mode, or use an environment specified port in production mode
app.set('port', process.env.PORT || 3000);
server.listen(app.get('port'));

// Tell express where static files are kept
app.use(express.static(__dirname + '/public'));

// Set up a sticky session to ensure real-time messages work over multiple instances
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

// Load local authentication configuration and service credentials for IBM
let localAuth;
try {
    localAuth = require('./auth-local.json');
  console.log("Loaded IBM Authentication");
} catch (e) {
    console.log("Failed to open IBM Local");
}

// Load local authentication configuration and service credentials for GAE
let gaeAuth;
try {
    gaeAuth = require('./gae-local.json');
    console.log("Loaded GAE Authentication");
} catch (e) {
    console.log("Failed to open GAE Local");
}

// Connect to the Natural Language API
const nlu = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
  authenticator: new IamAuthenticator({
    apikey: localAuth.services.nlu.apikey,
  }),
  url: localAuth.services.nlu.url,
});

// Connect to the Firestore API
const db = new Firestore({
    projectId: 'ask-a-lecturer',
    keyFilename: './gae-local.json',
});

//Web Pages

app.get('/', function (req, res) {
  req.session.originalUrl = '/';
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/tasks/countUsers', function (req, res) {
    res.json({users: users});
});

//User Functions
app.post("/user/verify", function (request, response) {
    var token = request.body.token;
    console.log(token)
    client.verifyIdToken({
        idToken: token,
        audience: gaeAuth.client_id // If you have multiple [CLIENT_ID_1, CLIENT_ID_2, ...]
    }, (err, login) => {
        console.log(err);
        console.log(login);
        response.send(login);
    });
});

// Verify User
async function verify() {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: gaeAuth.client_id  // Specify the CLIENT_ID of the app that accesses the backend
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
}


//DB Functions

app.post("/db/addQuestion", function (request, response) {
    var data = request.body;
    data.createdAt = new Date().getTime();

    let docRef = db.collection('questions').doc();
    docRef.set(data);

    io.emit('newQuestion', data);
    response.sendStatus(200);
});

app.get("/db/getQuestions", function (request, response) {
    var docs = [];
    let docRef = db.collection('questions');
    docRef.get().then(snapshot => {
        snapshot.forEach(doc => {
            var data = doc.data();
            data.id = doc.id
            docs.push(data);
        });
       response.send(docs);
    })
        .catch(err => {
            console.log('Error getting documents', err);
        });
});

// Socket Connection function
var users = 0;
io.on('connection', function (socket) {
  users++;
    io.emit('userCount', users);
  // Each socket also fires a special disconnect event
  socket.on('disconnect', function () {
    users--;
      io.emit('userCount', users);
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