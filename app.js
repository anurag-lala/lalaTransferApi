const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');
var routes = require('./routes');

var app = express();
var port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({
  extended: true
}))

// parse application/json
app.use(bodyParser.json())

app.use(cors());

//Defaut route path
app.get('/', function(req, res) {
  res.json({
    "message": "Welcome to LALA Transfer API"
  });
});

app.use('/api/v1', routes);

app.listen(port, function() {
  console.log('App is listening on port: ' + port);
  console.log('Application started on ' + new Date());
  console.log('http://localhost:' + port);

});
