var fs = require('fs');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var index = require('./routes/index');

var dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/).forEach(function(line) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    var separator = line.indexOf('=');
    if (separator === -1) {
      return;
    }

    var key = line.slice(0, separator);
    var value = line.slice(separator + 1).replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// set path for static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// routes
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  res.render('error', {status:err.status, message:err.message});
});

module.exports = app;
