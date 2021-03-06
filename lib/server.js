/**
 * Server relate tasks
 */


const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');

const util = require('util');
const debug = util.debuglog('server');

// Instantiate the sever module object
const server = {};

// Instantiating the http server
server.httpServer = http.createServer(function(req, res){
  server.unifiedServer(req, res)
})

// Instantiate the https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions,function(req, res){
  server.unifiedServer(req, res)
})



// All the logic for bot http and https server
server.unifiedServer = function(req, res) {
  // get url and parse it
  const parsedUrl = url.parse(req.url, true)



  // get path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+s/g, '');

  // get the query string as an object
  const queryStringObject = parsedUrl.query;

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
    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Use the public handler when the request is to the public directory
    chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

    // Construct the data onject to send to the handlers
    const data = {
      trimmedPath:  trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    }

    // Route the request to the handler specified in the router
    try {
      chosenHandler(data, function(statusCode, payload, contentType) {
        server.processServerResponse(res, method, trimmedPath, statusCode, payload, contentType);
      });
    } catch (e) {
      debug(e);
      server.processServerResponse(res, method, trimmedPath, 500, {'Error': 'An unknown error has occured'}, 'json');
    }
  });
}

// Process the response form the handler
server.processServerResponse = function(res, method, trimmedPath, statusCode, payload, contentType) {
  // Use the statusCode called back by the handler or default ot 200
  statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

  // Determin the type of response (fallback to json)
  contentType = typeof(contentType) == 'string' ? contentType : 'json';

  // return the reposnce parts that are content specific
  let payloadString = '';

  if (contentType === 'json') {
    res.setHeader('Content-Type', 'application/json');
    payload = typeof(payload) == 'object' ? payload : {};
    payloadString = JSON.stringify(payload);
  }

  if (contentType === 'html') {
    res.setHeader('Content-Type', 'text/html');
    payloadString = typeof(payload) == 'string' ? payload : '';
  }

  if (contentType === 'favicon') {
    res.setHeader('Content-Type', 'image/x-ixon');
    payloadString = typeof(payload) !== 'undefined' ? payload : '';
  }

  if (contentType === 'css') {
    res.setHeader('Content-Type', 'text/css');
    payloadString = typeof(payload) !== 'undefined' ? payload : '';
  }

  if (contentType === 'png') {
    res.setHeader('Content-Type', 'image/png');
    payloadString = typeof(payload) !== 'undefined' ? payload : '';
  }

  if (contentType === 'jpg') {
    res.setHeader('Content-Type', 'image/jpeg');
    payloadString = typeof(payload) !== 'undefined' ? payload : '';
  }

  if (contentType === 'plain') {
    res.setHeader('Content-Type', 'text/plain');
    payloadString = typeof(payload) !== 'undefined' ? payload : '';
  }

  // return the response parts that are common to all content-types
  res.writeHead(statusCode);
  res.end(payloadString);

  if (statusCode === 200) {
    debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode)
  } else {
    debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode)
  }
}

// Define a request route call router
server.router = {
  ping: handlers.ping,
  '' : handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico': handlers.favicon,
  'public': handlers.public,
  'examples/error': handlers.exampleError
}

// Init description
server.init = function() {
  // Start the http Server
  // Start the http server
  server.httpServer.listen(config.httpPort, function(){
    console.log('\x1b[33m%s\x1b[0m','The server listeneth on '+config.httpPort);
  })

  // Start the https server
  server.httpsServer.listen(config.httpsPort, function(){
    console.log('\x1b[34m%s\x1b[0m','The server listeneth on '+config.httpsPort);
  })
}


// Export the Server
module.exports = server;
