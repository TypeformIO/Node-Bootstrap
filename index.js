var express = require('express');
var fetch = require('node-fetch');
var localtunnel = require('localtunnel');
var bodyParser = require('body-parser')
var moment = require('moment');
var PromisePolyfill = require('es6-promise').Promise;
var semver = require('semver');

var app = express();

if(semver.lt(process.version, '0.11.16')) {
  throw new Error("You need to use nodejs version 0.11.16 or later");
}

// We want to serve our frontend from the /public folder
app.use(express.static('public'));

// Also, we need to be able to read the body in the request
app.use(bodyParser.json());

// API-KEY to use when creating the typeform
var API_KEY= process.env.TYPEFORM_API_KEY;

// Which version of the I/O API we want to use
var API_VERSION = 'v0.4'

// A public url where the webhook can find this application
var PUBLIC_URL = null;

// Which endpoint the webhooks will use
var SUBMIT_ENDPOINT = '/submit_answer';

// Which port to run the application on
var SERVER_PORT = 3000;

// Array with all the answers we've received so far
var ANSWERS = [];

// If there is no API_KEYset, we need to crash to prevent any auth errors
if(API_KEY=== undefined) {
  throw new Error('You need to set the environment variable TYPEFORM_API_KEY for this application to run');
}

// This will set the PUBLIC_URL to a domain that will map to your local computer
var tunnel = localtunnel(SERVER_PORT, function(err, tunnel) {
    if (err) {
      throw new Error(err);
    }
    PUBLIC_URL = tunnel.url;
});

// Helper method to create a new typeform
function create_typeform(form) {
  return new PromisePolyfill(function(resolve) {
    fetch('https://api.typeform.io/'+API_VERSION+'/forms', {
        method: 'POST',
        headers: {
          'X-API-TOKEN': API_TOKEN
        },
        body: JSON.stringify(form)
      }).then(function(response) {
        return response.json();
      }).then(resolve);
  });
}

// Endpoint that get hit by the frontend when clicking on "Create your typeform"
app.post('/create_form', function (req, res) {
  // Take the name from the request body
  var name = req.body.name;

  // The form we want to create
  var form = {
    title: 'Test Form',
    // This is the endpoint we'll use to receive the results via webhooks
    webhook_submit_url: PUBLIC_URL + SUBMIT_ENDPOINT,
    fields: [
      {
        type: 'yes_no',
        // Dynamic question with the users name
        question: 'Is your name really ' + name + '???'
      }
    ]
  };

  // Create our form and reply to the request we got
  create_typeform(form).then(function(created_form) {
    res.send(created_form);
  });
});

// Endpoint that get hit by Typeform I/O when a form have been submitted
app.post(SUBMIT_ENDPOINT, function(req, res) {
  var results = req.body;
  // Let's add the time when we received the results as well
  results.time = moment().format('H:mm:ss');
  // Add the full results to our ANSWERS storage
  ANSWERS.push(results)
});

// Endpoint that get hit by the frontend every second to update the list of results
app.get('/answers', function(req, res) {
  res.send(ANSWERS);
});

// Start express
var server = app.listen(SERVER_PORT, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server running on http://' + host + ':' + port);
});

