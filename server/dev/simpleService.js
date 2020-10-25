var express = require('express');
var bodyParser = require("body-parser");
const puppeteer = require('puppeteer');
var fs = require('fs');

var router = express.Router();
router.use(bodyParser.json({limit: global.service.payloadLimit, extended: true}));
router.use(bodyParser.urlencoded({limit: global.service.payloadLimit, extended: true}));

// Set some constant values to use if not passed
let width = 800
let height = 600
let workingDir = './www/data/';

// Simple all-in-one export
router.post('/scene/export-simple/:width?/:height?', function(req, res){
    var initialPayload = req.body.initialPayload && req.body.initialPayload.length != 0 ? req.body.initialPayload : undefined;
    var payload = req.body.payload && req.body.payload.length != 0 ? req.body.payload : undefined;
    width = req.params.width ? parseInt(req.params.width) : width;
    height = req.params.height ? parseInt(req.params.height) : height;

    //This method will use a local initialPayload & payload if these parameters are not supplied, so no need for error response message
     (async (width, height, payload, initialPayload, res) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
            ignoreHTTPSErrors: true
    })
    console.log('browser has been started');

    const page =  await browser.newPage();
    console.log('page has been created')
    
    //Configure the viewable size and resolution of the page
    await page.setViewport({
        width: width,
        height: height,
        deviceScaleFactor: 1
    });
    console.log('page has been configured')

    //Load the empty control in a page ready to recieve payloads
    await page.goto('https://localhost:3004/app.html?width=' + width + 'px&height=' + height + 'px');
    console.log('page has been loaded')

    //Feed payoads to adapter within web app - just feeds initial + one payload at the moment, but can take more payloads if required 
    await page.evaluate(function(payloads) {
        var promises = [];
        var adapter = sap.ui.getCore().byId('vb-adapter');
        
        payloads.forEach(function(payload){
            promises.push(adapter.load(payload));
        })
        return Promise.all(promises)
    }, [
        initialPayload || JSON.parse(fs.readFileSync(workingDir + 'initialPayload.json', 'utf8')), 
        payload || JSON.parse(fs.readFileSync(workingDir + 'payload.json', 'utf8'))]);

    //Take a screenshot of the page and return as base64 encoded string
    await page.screenshot({
        omitBackground: true,
        encoding: "binary",
        //path: workingDir + output, // in not provided then not saved to disk
        clip:{
            x: 0,
            y: 0,
            width: width,
            height: height
        }
    }).then(function(imgData){
        res.type('png');
        res.end(imgData);
    });

    // free up resources
    console.log('screenshot has been taken')

    await browser.close()
    console.log('browser has been closed')
    })(width, height, payload, initialPayload, res);
});

module.exports = router;