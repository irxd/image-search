// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var https = require('https');
var db = require('./model/db');
var History = require('./model/histories');

let subscriptionKey = process.env.API_KEY;
let host = 'api.cognitive.microsoft.com';
let path = '/bing/v7.0/search';

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/api/imagesearch/:terms", function (req, res) {
  var terms = req.params.terms;
  
  var history = new History({
    term: terms,
    when: Date.now()
  });
  
  history.save(function(err, history) {
    if (err) throw err;
  });
  
  let response_handler = function (response) {
    let body = '';
    response.on('data', function (d) {
        body += d;
    });
    response.on('end', function () {
        console.log('\nRelevant Headers:\n');
        for (var header in response.headers)
            // header keys are lower-cased by Node.js
            if (header.startsWith("bingapis-") || header.startsWith("x-msedge-"))
                 console.log(header + ": " + response.headers[header]);
        body = JSON.parse(body)
        console.log('\nJSON Response:\n');
        var images = body.images.value;
        // res.send(images);
        res.send(images.map(function(image) {
          return {
            "url": image.contentUrl,
            "snippet": image.name,
            "thumbnail": image.thumbnailUrl,
            "context": image.hostPageUrl
          };
        }));
    });
    response.on('error', function (e) {
        console.log('Error: ' + e.message);
    });
  };

  let bing_web_search = function (search) {
    console.log('Searching the Web for: ' + terms);
    let request_params = {
          method : 'GET',
          hostname : host,
          path : path + '?q=' + encodeURIComponent(search),
          headers : {
              'Ocp-Apim-Subscription-Key' : subscriptionKey,
          }
      };

      let req = https.request(request_params, response_handler);
      req.end();
  }

  if (subscriptionKey.length === 32) {
      bing_web_search(terms);
  } else {
      console.log('Invalid Bing Search API subscription key!');
      console.log('Please paste yours into the source code.');
  }
  
});

app.get("/api/latest/imagesearch/", function (request, response) {
  History
    .find({})
    .select('when term -_id')
    .sort({when: -1})
    .limit(10)
    .exec(function(err, histories) {
      if (err) throw err;
      response.json(histories);
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});