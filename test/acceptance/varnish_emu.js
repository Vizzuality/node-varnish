var net = require('net');

function VarnishEmu(on_cmd_recieved, port) {
    var self = this;
    var welcome_msg = 'hi, im a varnish emu, right?';

    self.commands_recieved = [];

    var sockets = [];
    var server = net.createServer(function (socket) {
      var command = '';
      socket.write("200 " + welcome_msg.length + "\n");
      socket.write(welcome_msg);
      socket.on('data', function(data) {
        self.commands_recieved.push(data);
        server.commands++;
        on_cmd_recieved && on_cmd_recieved(self.commands_recieved);
        socket.write('200 0\n');
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

