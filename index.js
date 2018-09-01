/**
 * Primary file for API
 */


const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
console.log(config);

// The server should respond to all request with a string
const server = http.createServer(function(req, res){
  // get url and parse it
  const parsedUrl = url.parse(req.url, true)

  // get path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+s/g, '');

  // get the query string as an object
  const queryStringObject = parsedUrl.query;
  // console.log(queryStringObject)

  // get http method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers

  // Get payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function() {
    buffer += decoder.end();

    // Choose the handle this request should go to else use the not found handler
    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct the data onject to send to the handlers
    const data = {
      trimmedPath:  trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: buffer
    }

    //  Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload) {
      // Use the statusCode called back by the handler or default ot 200
      // Use the payload called back by the handler of default to an empty queryStringObject
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert payload to a string
      const payloadString = JSON.stringify(payload);

      // return the reposnce
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode);
      // send response
      res.end(payloadString);
      // log the path requested
      console.log('Returun this response: ', statusCode, payloadString);
    })
  })
})

// Start the server and have it listen on port 3000
server.listen(config.port, function(){
  console.log('The server listeneth on '+config.port+ '. Environment is '+config.name);
})
// Define handlers
const handlers = {};

// Ping handler
handlers.ping = function (data, callback){
  callback(200);
}

//  Not found handlers
handlers.notFound = function(data, callback) {
  callback(404);
}
// Define a request route call router
const router = {
  ping: handlers.ping,
}
