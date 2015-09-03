var express = require('express');
var fetch = require('node-fetch');
var localtunnel = require('localtunnel');
var bodyParser = require('body-parser')
var moment = require('moment');
var semver = require('semver');

var app = express();

// Promises only work in 0.11 or above that has Promises
if(semver.lt(process.version, '0.11.16')) {
  throw new Error("You need to use nodejs version 0.11.16 or later");
}

// We want to serve our frontend from the /public folder
app.use(express.static('public'));

// Also, we need to be able to read the body in the request
app.use(bodyParser.json());

// API-KEY to use when creating the typeform
var API_KEY = process.env.TYPEFORM_API_KEY;

var config = {
  // Which version of the I/O API we want to use
  api_version: 'v0.4',
  // Which endpoint the webhooks will use
  submit_endpoint: '/submit_answer',
  // Which port to run the application on
  server_port: 3000
}

var globals = {
  // Array with all the answers we've received so far
  answers: [],
  // A public url where the webhook can find this application
  public_url: null
}

// If there is no API_KEYset, we need to crash to prevent any auth errors
if(API_KEY=== undefined) {
  throw new Error('You need to set the environment variable TYPEFORM_API_KEY for this application to run');
}



// Endpoint that get hit by the frontend when clicking on "Create your typeform"
app.post('/create_form', function (req, res) {
  // Take the name from the request body
  var name = req.body.name;

  // The form we want to create
  var form = {
    title: 'Test Form',
    // This is the endpoint we'll use to receive the results via webhooks
    // We're adding the name from the user as a parameter, encoded
    // It will look something like this: https://your_url.com/submit_answer/Victor%20Bjelkholm
    webhook_submit_url: globals.public_url + config.submit_endpoint + '/' + encodeURIComponent(name),
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
app.post(config.submit_endpoint + '/:name', function(req, res) {
  var results = req.body;
  // Let's add the time when we received the results as well
  results.time = moment().format('H:mm:ss');
  // Let's also add the name that this answer was for
  results.name = decodeURIComponent(req.params.name);
  // Add the full results to our answers global
  globals.answers.push(results)
});

// Endpoint that get hit by the frontend every second to update the list of results
app.get('/answers', function(req, res) {
  res.send(globals.answers);
});

// Start express
var server = app.listen(config.server_port, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server running on http://' + host + ':' + port);
});

// Helper method to create a new typeform
function create_typeform(form) {
  return new Promise(function(resolve) {
    fetch('https://api.typeform.io/'+config.api_version+'/forms', {
        method: 'POST',
        headers: {
          'X-API-TOKEN': API_KEY
        },
        body: JSON.stringify(form)
      }).then(function(response) {
        return response.json();
      }).then(resolve);
  });
}

// This will set the public_url to a domain that will map to your local computer
localtunnel(config.server_port, function(err, tunnel) {
    if (err) {
      throw new Error(err);
    }
    globals.public_url = tunnel.url;
});
