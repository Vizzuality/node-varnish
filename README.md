node-varnish
==

A node.js connector to Varnish using the [Varnish telnet management protocol](https://www.varnish-cache.org/trac/wiki/ManagementPort).

```javascript
var Varnish = require('node-varnish');

var client = new Varnish.VarnishClient('127.0.0.1', MANAGEMENT_PORT);
client.on('ready', function() {
    client.run_cmd('purge obj.http.X == test', function(){});
});
```

For more usage examples, see the [tests](https://github.com/Vizzuality/node-varnish/blob/master/test/acceptance/varnish.js).

Install
--
```
npm install node-varnish
```

Dependencies
--

* [node.js](http://nodejs.org/) >=4.x
* [varnish](https://www.varnish-cache.org/) >=2.x

Contributors
--

* [Javi Santana](https://github.com/javisantana/)
* [Simon Tokumine](https://github.com/tokumine/)
