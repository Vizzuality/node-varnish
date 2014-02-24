var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    VarnishClient = require('./varnish_client');

// @param opts extrac configurations:
//    max_queue - max number of items in queue, defaults to 2000
//                new items will be discarded
//    max_recon_retries - max number of reconnection attempts
//                        defaults to 120
//    recon_interval_ms - interval in milliseconds between
//                        reconnection attempts. Defaults to 1000.
//
function VarnishQueue(host, port, secret, opts) {
    var self = this;
    var queue = [];
    var ready = false;
    var reconnectTimer = null;
    var reconnectTries = 0;
    opts = opts || {};
    if ( ! opts.hasOwnProperty('max_queue') ) opts.max_queue = 2000;
    if ( ! opts.hasOwnProperty('max_recon_retries') ) opts.max_recon_retries = 120;
    if ( ! opts.hasOwnProperty('recon_interval_ms') ) opts.recon_interval_ms = 1000;

    var MAX_QUEUE = opts.max_queue;
    var MAX_RECONNECT_TRIES = opts.max_recon_retries;
    var RECONNECT_INTERVAL = opts.recon_interval_ms;

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
                var err = new Error('max reconnect tries, aborting');
                err.code = 'ABORT_RECONNECT';
                self.emit('error', err);
                clearInterval(reconnectTimer);
            }
        }, RECONNECT_INTERVAL);
    }
    client.on('close', reconnect);
    client.on('error', function(err) {
      console.log("Varnish connection error: " + err);
      reconnect();
    });

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
            var err = new Error("varnish command queue too long, removing commands");
            err.code = 'TOO_LONG';
            self.emit('error', err);
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
