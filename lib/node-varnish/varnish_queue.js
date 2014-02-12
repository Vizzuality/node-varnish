var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    VarnishClient = require('./varnish_client');

function VarnishQueue(host, port, secret) {
    var self = this;
    var MAX_QUEUE = 2000;
    var queue = [];
    var ready = false;
    var reconnectTimer = null;
    var reconnectTries = 0;
    var MAX_RECONNECT_TRIES = 120; // 2 minutes

    var client = new VarnishClient(host, port, secret);

    self.debug = false;
    
    function log() {
        self.debug && console.log.apply(console, arguments);
    }

    // attach a dummy callback to error event to avoid nodejs throws an exception and closes the process
    self.on('error', function(e) {
        log("error", e);
    });

    client.on('connect', function() {
        clearInterval(reconnectTimer);
        reconnectTries = 0;
    });

    client.on('ready', function() {
        ready = true;
        log('sending pending');
        _send_pending();
    });

    function reconnect() {
        ready = false;
        clearInterval(reconnectTimer);
        reconnectTimer = setInterval(function() {
            client.connect();
            ++reconnectTries;
            if(reconnectTries >= MAX_RECONNECT_TRIES) {
                self.emit('error', {
                    code: 'ABORT_RECONNECT',
                    message: 'max reconnect tries, abouting'
                });
                clearInterval(reconnectTimer);
            }
        }, 1000);
    }
    client.on('close', reconnect);
    client.on('error', reconnect);

    function _send_pending(empty_callback) {
        if(!ready) return;
        var c = queue.pop();
        if(!c) return;
        client.run_cmd(c, function() {
            if(queue.length > 0) {
                process.nextTick(_send_pending);
            } else {
                if(empty_callback) {
                    empty_callback();
                }
                self.emit('empty');
            }
        });
    }

    self.run_cmd = function(cmd, nodup) {
        if ( nodup && queue.indexOf(cmd) != -1 ) {
          log("skip duplicated varnish command in queue: " + cmd);
          return;
        }
        queue.push(cmd);
        if(queue.length > MAX_QUEUE) {
            console.log("varnish command queue too long, removing commands");
            self.emit('error', {code: 'TOO_LONG', message: "varnish command queue too long, removing commands"});
            queue.pop();
        }
        if(ready) {
            _send_pending();
        }
    };

    self.end = function() {
        _send_pending(function() {
            client.close();
        });
    };
}

util.inherits(VarnishQueue, EventEmitter);

module.exports = VarnishQueue;
