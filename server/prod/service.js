const express = require('express');
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');
const fs = require('fs');

const router = express.Router();
router.use(bodyParser.json({limit: global.service.payloadLimit, extended: true}));
router.use(bodyParser.urlencoded({limit: global.service.payloadLimit, extended: true}));

// Set some constant values to use if not passed
let width = 800;
let height = 600;
let glTFData = undefined;
const workingDir = './www/data/';

// Export the resultant scene in the specified format
router.post('/scene/export/:key?/:width?/:height?/', function(req, res){ // ?resultType=json
    let key = req.params.key;
    let initialPayload = global.initialPayloads[key] ? global.initialPayloads[key] : JSON.parse(fs.readFileSync(workingDir + 'initialPayload.json', 'utf8'));
    let payload = req.body.payload || null;
    let identifier = req.body.identifier || new Date().getTime();
    let resultType = req.query.resultType;
    width = req.params.width ? parseInt(req.params.width) : width;
    height = req.params.height ? parseInt(req.params.height) : height;
    let encoding = resultType ? "base64" : "binary";

    if(initialPayload === undefined) {
        res.type('json');
        res.send({
            operation: "/scene/export/:key?/:width?/:height?/?resultType=json",
            phase: "VALIDATION",
            state: "ERROR",
            data: req.body,
            errorMessages: 'Specified initial payload does not exist'
        });
    } else {
        (async (key, width, height, payload, initialPayload, res, resultType, identifier) => {
        try
        {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-gpu'],
                ignoreHTTPSErrors: true
            });
            const page =  await browser.newPage();;

            await page.setViewport({
                width: width,
                height: height,
                deviceScaleFactor: 1
            });
            
            await page.goto('https://localhost:3004/app.html?width=' + width + 'px&height=' + height + 'px');

            // feed payoads to adapter within web app
            await page.evaluate(function(payloads) {
                var promises = [];
                var adapter = sap.ui.getCore().byId('vb-adapter');
                
                payloads.forEach(function(payload){
                    promises.push(adapter.load(payload));
                })
                return Promise.all(promises)
            }, [initialPayload, payload]);

            //Take a screenshot of the page and return as base64 encoded string
            await page.screenshot({
                omitBackground: true,
                encoding: encoding,
                clip:{
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                }
            }).then(function(base64){
                let responseObject = null;
                switch(resultType){
                    case 'html':
                        res.type('html');
                        responseObject = '<img src="data:image/png;base64, ' + base64 + '" alt="' + identifier + '" />';
                        break;

                    case 'json':
                        res.type('json');
                        responseObject = {
                            operation: "/scene/export/:key?/:width?/:height?/?resultType=json",
                            phase: "VALIDATION",
                            state: "SUCCESS",
                            identifier: identifier,
                            output: {
                                image: {
                                    type: 'png',
                                    data: base64
                                }
                            }
                        };
                        break;

                    default:  // base64 binary png
                        res.type('png');
                        res.end(base64);                    
                }

                if (resultType !== undefined)
                    res.send(responseObject);
            });

            await browser.close();

            console.log(new Date().toLocaleString() + " : screenshot exported - " + (resultType ? resultType : "base64 binary"));
        }
        catch(err)
        {
            console.log(new Date().toLocaleString() + " : " + err);
        }
    })(key, width, height, payload, initialPayload, res, resultType, identifier);
    }
});

// POST method route
// Creates a new 'session' using the initial payload posted to the endpoint. 
router.post('/scene/setinitial/:key?', (req, res) => {
        if(!req.body.initialPayload) {
            res.type('json');
            res.send({
                operation: "/scene/setinitial/:key?",
                phase: "VALIDATION",
                state: "ERROR",
                data: req.body,
                errorMessages: 'No intial payload provided'
            });
        } else { 
            const payload = req.body.initialPayload
            const key = req.params.key;
            let fileCreated = false;

            if (key)
                global.initialPayloads[key] = payload;
            else
            {
                let fileData = JSON.stringify(payload);
                fs.writeFileSync(workingDir + 'initialPayload.json', fileData);
                fileCreated = true;
            }

            res.type('json');
            res.send({
                operation: "/scene/setinitial/:key?",
                phase: "EXECUTE",
                state: "SUCCESS",
                data: {key: key, dataLength:payload.length, localFileCreated:fileCreated}
            });
        }
});

// Clear the current scene, but reuse the current initial payload
router.get('/service/stop', function(req, res){
    console.log("Stopping HTTP service");
    res.type('json');
    res.send({
        operation: "/service/stop",
        phase: "EXECUTE",
        state: "RECIEVED",
        message: "No further response expected if successful"
    });
    global.server.instance.close(function() {
        var msg = 'Closed HTTP Server on port:' + global.server.port;
        console.log(msg);
        process.exit();
    });
});

module.exports = router;