/*
  Copyright (C) 2013, Daishi Kato <daishi@axlight.com>
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* jshint evil: true */

var express = require('express');
var path = require('path');
var request = require('request');
var htmlparser = require('htmlparser');
var jsonpath = require('JSONPath').eval;
var rss = require('rss');
var ent = require('ent');

var site_prefix = process.env.SITE_PREFIX || 'http://gunosy-rss.herokuapp.com/';

var app = express();
app.configure(function() {
  app.use(express.logger());
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
});

function getFirst(array) {
  if (Array.isArray(array)) {
    return array[0];
  } else {
    return array;
  }
}

function getLast(array) {
  if (Array.isArray(array)) {
    return array[array.length - 1];
  } else {
    return array;
  }
}

function generate_rss(req, gunosy_id, callback) {
  var headers = {
    'User-Agent': 'Mozilla/5.0',
    cookie: '_gunosy_session=' + (req.query.gunosy_session || 'empty')
  };
  console.time('time-fetch-' + gunosy_id);
  request({
    url: 'http://gunosy.com/' + gunosy_id,
    headers: headers
  }, function(err, res, body) {
    console.timeEnd('time-fetch-' + gunosy_id);
    if (err) {
      callback(err);
      return;
    }
    var handler = new htmlparser.DefaultHandler(function(err, dom) {
      if (err) {
        callback(err);
        return;
      }
      var entries = jsonpath(dom, '$..children[?(@.type=="tag" && @.name=="div" && @.attribs.class=="cell_article")]');
      var feed = new rss({
        title: 'Gunosy Summary of ' + gunosy_id,
        feed_url: site_prefix + gunosy_id + '.rss',
        site_url: 'http://gunosy.com/' + gunosy_id
      });
      entries.forEach(function(entry) {
        var entry_title = getFirst(jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="h2")]'));
        var entry_summary = getFirst(jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="div" && @.attribs.class=="description")]'));

        // creating item title
        var item_title = jsonpath(entry_title, '$..children[?(@.type=="text")].data');

        // creating item url
        var item_url = ent.decode('' + getLast(jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="a" && @.attribs.target=="_blank")].attribs.href')));
        if (item_url.lastIndexOf('/redirect?', 0) === 0) {
          if (req.query.u) {
            item_url = 'http://gunosy.com/redirect?u=' + req.query.u + '&' + item_url.substring(10);
          } else {
            // decoding a redirect link, just in case.
            var match = item_url.match(/&url=(.*)/);
            if (match) {
              item_url = decodeURIComponent(match[1]);
            }
          }
        }

        // creating item description
        var item_description = jsonpath(entry_summary, '$..children[?(@.type=="text")].data');
        var figure_url = ent.decode('' + getFirst(jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="img")].attribs.src')));
        if (figure_url) {
          figure_url = figure_url.replace(/^http:\/\/imageproxy.*?\?u=(.*)/, '$1');
          figure_url = figure_url.replace(/^(\/assets.*)/, 'http://gunosy.com$1');
          item_description = '<img src="' + figure_url + '" /><p>' + item_description + '</p>';
        }

        feed.item({
          title: item_title,
          url: item_url,
          description: item_description
        });
      });
      callback(null, feed.xml());
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(body);
  });
}

app.get('/', function(req, res) {
  res.redirect('http://dai-shi.github.io/gunosy-rss/');
});

var processing = false;
app.get(new RegExp('^/(.+)\\.rss$'), function(req, res) {
  var gunosy_id = req.params[0];
  if (processing) {
    res.header('Retry-After', Math.floor(Math.random() * 3600));
    res.send(503, 'busy now, retry later');
  } else {
    processing = true;
    console.time('time-generate-' + gunosy_id);
    generate_rss(req, gunosy_id, function(err, result) {
      console.timeEnd('time-generate-' + gunosy_id);
      processing = false;
      if (err) {
        console.log('failed in generate_rss', err);
        res.send(500, 'failed generating rss');
      } else {
        res.header('Content-Type', 'text/xml; charset=utf-8');
        res.header('Last-Modified', new Date().toUTCString());
        res.send(result);
      }
    });
  }
});

app.get(new RegExp('^/static/(.+)\\.html$'), function(req, res) {
  var view_name = req.params[0];
  res.render(view_name, {
    site_prefix: site_prefix
  });
});

app.use('/static', express.static(path.join(__dirname, 'public')));

app.listen(process.env.PORT || 5000);
