/*
  Copyright (C) 2013 Daishi Kato <daishi@axlight.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jshint es5:true */

var express = require('express');
var request = require('request');
var htmlparser = require('htmlparser');
var jsonpath = require('JSONPath').eval;
var rss = require('rss');
var ent = require('ent');

var app = express();
app.use(express.logger());

function generate_rss(req, gunosy_id, callback) {
  request({
    url: 'http://gunosy.com/' + gunosy_id,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  }, function(err, res, body) {
    if (err) {
      callback(err);
      return;
    }
    var handler = new htmlparser.DefaultHandler(function(err, dom) {
      if (err) {
        callback(err);
        return;
      }
      var entries = jsonpath(dom, '$..children[?(@.type=="tag" && @.name=="div" && @.attribs.class=="entry-content")]');
      var feed = new rss({
        title: 'Gunosy Summary of ' + gunosy_id,
        feed_url: req.url,
        site_url: 'http://gunosy.com/' + gunosy_id
      });
      entries.forEach(function(entry) {
        var entry_title = jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="h1" && @.attribs.class=="entry-title")]');
        var entry_summary = jsonpath(entry, '$..children[?(@.type=="tag" && @.name=="div" && @.attribs.class=="entry-summary")]');
        feed.item({
          title: jsonpath(entry_title, '$..children[?(@.type=="text")].data'),
          url: ent.decode('' + jsonpath(entry_title, '$..children[?(@.type=="tag" && @.name=="a")].attribs.href')),
          description: jsonpath(entry_summary, '$..children[?(@.type=="text")].data')
        });
      });
      callback(null, feed.xml());
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(body);
  });
}

app.get('/', function(req, res) {
  res.redirect('http://dai-shi.github.com/gunosy-rss/');
});

app.get(new RegExp('^/(.+)\.rss$'), function(req, res) {
  var gunosy_id = req.params[0];
  generate_rss(req, gunosy_id, function(err, result) {
    if (err) {
      console.log('failed in generate_rss', err);
      res.send(500, 'failed generating rss');
    } else {
      res.send(result);
    }
  });
});


app.listen(process.env.PORT || 5000);
