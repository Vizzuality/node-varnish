var net = require('net');

function VarnishEmu(on_cmd_recieved, port, requireAuth) {
    var self = this,
        msg = '', 
        code = 0;

    self.commands_recieved = [];
    var sockets = [];
    var server = net.createServer(function (socket) {
        if(requireAuth){
            msg = 'bkiehgjkhonrgtlzvikyvynswrinerqf';
            code = 107;
        } else {
            msg = 'hi, im a varnish emu, right?';
            code = 200;
        }
        socket.write(code + " " + msg.length + "\n");
        socket.write(msg);
        socket.on('data', function(data) {
            self.commands_recieved.push(data);
            server.commands++;
            on_cmd_recieved && on_cmd_recieved(self.commands_recieved);
            if(requireAuth){
                if(data.toString('utf8') === 'auth 1ae1b9b5069b151d5ad5ee3339a33dc5321b5fa7ad2c31709d21490ba90e6a09\n'){
                    socket.write('200 0\n');
                }else{
                    socket.write(code + " " + msg.length + "\n");
                    socket.write(msg);
                }
            }else{
                socket.write('200 0\n');
            }
        });
        sockets.push(socket);
    });
    
    server.commands = 0;
    server.listen(port || 0, "127.0.0.1");
    server.close_connections = function() {
        for(var s in sockets) {
            sockets[s].end();
        }
    };
    return server;
}

module.exports = VarnishEmu;