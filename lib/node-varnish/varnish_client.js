var net = require('net'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

function VarnishClient(host, port, secret, ready_callback) {
    var self = this; 
    var ready = false;
    var cmd_callback = null;
    var client = null;
    var connected = false;
    var connecting = false;
    self.debug = false;
    
    // secret is an optional argument
    if (arguments.length < 4 && typeof secret === 'function') {
        ready_callback = secret;
        secret = undefined;
    }
    
    function log() {
        self.debug && console.log.apply(console, arguments);
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

    function authenticate(challenge) {
        var err = '',
            crypto = require('crypto'),
            shasum = crypto.createHash('sha256'),
            authResponse = '';
        
        if(authenticate.atempt){
            err = 'Unable to authenticate - unauthorized';
            log(err);
            ready_callback && ready_callback(new Error(err));
            self.emit('error', '[ERROR] '+err);
            return;
        }
        authenticate.atempt = true;
        
        log('Authentication required. challenge: ', challenge);
        if(!secret) {
            err = 'Unable to authenticate - no secret provided';
            log(err);
            ready_callback && ready_callback(new Error(err));
            self.emit('error', '[ERROR] '+err);
            return;
        }
        
        shasum.update(challenge + "\n" + secret + "\n" + challenge + "\n");
        authResponse = shasum.digest('hex');
        client.write('auth ' + authResponse + "\n" );
        
        log('Authentication submited: ', authResponse);
    }
    
    self.connect = connect;
    connect();
    
    client.on('data', function (data) {
        data = data.toString();
        var lines = data.split('\n', 2);
        if(lines.length == 2) {
            var tk = lines[0].split(' ');
            var code = parseInt(tk[0], 10);
            //var body_length = parseInt(tk[1], 10);
            var body = lines[1];
            
            if(code === 107){//requires auth
                authenticate(body);
                return;
            }
            
            if(!ready) {
                ready = true;
                self.emit('ready');
                log("VARNISH Client: ready");
                ready_callback && ready_callback(null, self);
            } else if(cmd_callback) {
                var c = cmd_callback;
                cmd_callback = null;
                c(null, code, body);
                self.emit('response', code, body);
                log("VARNISH response: ", code, body);
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
    self.run_cmd = function(cmd, callback) {
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
    };

    // close the connection
    self.close = function() {
       client.end();
       ready = false; 
       self.emit('close');
    };

}

util.inherits(VarnishClient, EventEmitter);

module.exports = VarnishClient;