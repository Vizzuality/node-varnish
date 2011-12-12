node-varnish
==

A node.js implementation of the Varnish telnet management protocol (https://www.varnish-cache.org/trac/wiki/ManagementPort)

```javascript
var client = new varnish.VarnishClient('127.0.0.1', server.address().port);
client.on('ready', function() {
    client.run_cmd('purge obj.http.X == test', function(){});
});
```

For more usage examples, see the tests.

Dependencies
--

* [node.js](http://nodejs.org/) >=4.x
* [varnish](https://www.varnish-cache.org/) >=2.x

Contributors
--

* [Javi Santana](https://github.com/javisantana/) - core code base
* [Simon Tokumine](https://github.com/tokumine/) - packaging and docs
