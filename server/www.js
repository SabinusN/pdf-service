/**
 * Module dependencies.
 */

var app = require('../app');
var http = require('http');
/**
 * Get port from environment and store in Express.
 */

 if(global.server.instance) {
  console.log('Restarting server');
 } else {
  console.log('Starting server');
 }

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

if(!global.server.instance) {
  var port = normalizePort(process.env.PORT || global.server.port);
  global.server.port = port;

  app.set('port', port);
  app.set('requestCert', true);
  app.set('rejectUnauthorized', false);

  /**
   * Create HTTP server.
   */
  global.server.instance = http.createServer(app);


  /**
   * Listen on provided port, on all network interfaces.
   */
  global.server.instance.listen(port, null, 0, onListening);
  global.server.instance.on('error', onError);

} else {
  console.log('Server already running on port:' + global.server.port);
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = global.server.instance.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

