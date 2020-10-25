'use_strict';

// Module registration 
var express = require('express');
const sapui5 = require('sapui5-runtime')
var path = require('path');

//Set global paramters
global.initialPayloads = {}; //structure to store key/value initial payloads
global.server = {
    instance: undefined,
    port: 3004
}; 
global.service = {
    payloadLimit: '50mb'    
};
global.cache = {}; // {"key" : { header: 'image/png', data: base64 }}

// Retrive routes
var serviceApi = require('./server/prod/service.js');

var simpleServiceApi = require('./server/dev/simpleService.js');
var servicePdf = require('./server/dev/servicePdf.js');

// Configure the app
var app = express();
app.use('/', express.static(path.join(__dirname, 'www')));
app.use('/resources', express.static(sapui5))
app.use("/build", express.static(path.join(__dirname, 'node_modules/three/build')));
app.use("/jsm", express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));
//app.use("/jsm/utils", express.static(path.join(__dirname, 'node_modules/three/examples/jsm/utils')));
//app.use("/jsm/loaders", express.static(path.join(__dirname, 'node_modules/three/examples/jsm/loaders')));
app.use(serviceApi);
app.use(simpleServiceApi);
app.use(servicePdf);

module.exports = app;
