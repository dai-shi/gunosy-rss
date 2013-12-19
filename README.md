gunosy-rss
==========

Gunosy RSS feed web service by Node.js


How to use
----------

Simply use the following link for RSS feed.

    http://gunosy-rss.herokuapp.com/<gunosy_id>.rss

You need to replace `<gunosy_id>` with a proper one.

Japanese page is [here](http://dai-shi.github.io/gunosy-rss/).


Limitations
-----------

* Gunosy page must be public.
* If it takes more than 30sec, an application error occurs.
  * More efficent cache algorithm is needed.

