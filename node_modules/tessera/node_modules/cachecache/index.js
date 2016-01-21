"use strict";

var fresh = require("fresh"),
    LRU = require("lru-cache")

module.exports = function(options) {
  options = options || {};

  var CACHE = LRU({
    max: options.max || 100000
  });

  return function(req, res, next) {
    if (fresh(req.headers, CACHE.get(req.url) || {})) {
      return res.sendStatus(304);
    }

    res.on("finish", function() {
      var headers = {
        "last-modified": res.getHeader("last-modified") || new Date()
      };

      ["etag", "cache-control"].forEach(function(name) {
        var v;

        if ((v = res.getHeader(name))) {
          headers[name] = v;
        }
      });

      CACHE.set(req.url, headers);
    });

    return next();
  };
};
