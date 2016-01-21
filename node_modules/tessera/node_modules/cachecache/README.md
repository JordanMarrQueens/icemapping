# cachecache

Connect middleware to preemptively handle requests containing `If-None-Match`
and `If-Modified-Since` headers.

By default, Express _will_ return 304s for dynamic content, but only after it
has been regenerated. This caches response headers (but not bodies) to allow
304s to be sent without potentially-costly content regeneration.

## Usage

```bash
npm install --save cachecache
```

```javascript
var app = require("express")();

app.use(require("cachecache")({
  max: 1000000 // maximum number of entries in the underlying LRU cache;
               // default value
});

// ...
```
