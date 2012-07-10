var net = require('net')
var EventEmitter = require('events').EventEmitter;

function VarnishClient(host, port, ready_callback) {

    var self = this;
    var ready = false;
    var cmd_callback = null;
    var client = null;
    var connected = false;
    var connecting = false;

    function log() {
        console.log.apply(console, arguments);
    }

    function connect() {
        if(connecting || connected ) return;
        connecting = true;
        log("VARNISH: connection");
        ready = false;
        if(!client) {
            client = net.createConnection(port, host);
            client.on('connect', function () {
                log("VARNISH: connected");
                connected = true;
                self.emit('connect');
                connecting = false;
            });
        } else {
            client.connect(port, host);
        }
    }
    self.connect = connect;


    connect();

    client.on('data', function (data) {
        data = data.toString();
        var lines = data.split('\n', 2);
        if(lines.length == 2) {
            var tk = lines[0].split(' ')
            var code = parseInt(tk[0], 10);
            var body_length = parseInt(tk[1], 10);
            var body = lines[1];
            if(!ready) {
                ready = true;
                ready_callback && ready_callback();
                self.emit('ready');
            } else if(cmd_callback) {
                var c = cmd_callback
                cmd_callback = null;
                c(null, code, body);
                self.emit('response', code, body)
            }
        }

    });

    client.on('error', function(err) {
        log("[ERROR] some problem in varnish connection", err);
        self.emit('error', err);
    });

    client.on('close', function(e) {
        log("[INFO] closed varnish connection");
        self.close();
        connected = false;
        connecting = false;
    });

    // sends the command to the server
    function _send(cmd, callback) {
      cmd_callback = callback;
      if(connected) {
        client.write(cmd + '\n');
      } else {
        connect();
      }
    }

    // run command if there is no peding response
    // fist param of the callback are the error, null
    // if all went ok
    this.run_cmd = function(cmd, callback) {
       if(!connected) {
           connect();
       }
       if(!cmd_callback) {
         _send(cmd, callback);
       } else {
         callback('response pending');
         self.emit('error', {
            code: 'RESPONSE_PENDING',
            message: 'there is a response pending'
         });
       }
    }

    // close the connection
    this.close = function() {
       client.end();
       ready = false; 
       self.emit('close');
    }
}
VarnishClient.prototype = new EventEmitter();

module.exports = VarnishClient;
