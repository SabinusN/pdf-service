var express = require('express');
var bodyParser = require("body-parser");
const puppeteer = require('puppeteer');

var router = express.Router();
router.use(bodyParser.json({limit: global.service.payloadLimit, extended: true}));
router.use(bodyParser.urlencoded({limit: global.service.payloadLimit, extended: true}));

// Set some constant values to use if not passed
let width = 800
let height = 600
let resultType = 'json' //json, html, binary
let glTFFormat = undefined; //gltf export is optional, glTFFormat options are glb | gltf
let glTFData = undefined;

// Export the resultant scene in the specified format
router.post('/scene/export/:key/:width/:height/:resultType?', function(req, res){
    var key = req.params.key || "default";
    var initialPayload = global.initialPayloads[key];
    var payload = req.body.payload || null;
    var identifier = req.body.identifier || new Date().getTime();
    width = req.params.width ? parseInt(req.params.width) : width;
    height = req.params.height ? parseInt(req.params.height) : height;
    resultType = req.params.resultType ? req.params.resultType : resultType;
    glTFFormat = req.body.glTFFormat ? req.body.glTFFormat : glTFFormat;

    if(initialPayload === undefined) {
        res.type('json');
        res.send({
            operation: "/scene/export/:key/:width/:height/:resultType?",
            phase: "VALIDATION",
            state: "ERROR",
            data: req.body,
            errorMessages: 'Specified initial payload does not exist'
        });
    } else {
        (async (key, width, height, payload, initialPayload, res, returnType, identifier) => {
        const browser = await puppeteer.launch({
            //headless: true,
            headless: false,
            slowMo: 250, // slow down by 250ms
            args: ['--no-sandbox', '--disable-gpu']
        })
        console.log('browser has been started');
        const page =  await browser.newPage();
		console.log('page has been created')
		await page.setViewport({
			width: width,
			height: height,
			deviceScaleFactor: 1
		});
        console.log('page has been configured')
        //await page.goto('http://localhost:3004/app.html?width=' + width + 'px&height=' + height + 'px');
        await page.goto('https://images.unsplash.com/photo-1523895665936-7bfe172b757d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=800&q=80');
		console.log('page has been loaded')

		// feed payoads to adapter within web app
		// await page.evaluate(function(payloads) {
		// 	var promises = [];
		// 	var adapter = sap.ui.getCore().byId('vb-adapter');
            
		// 	payloads.forEach(function(payload){
		// 		promises.push(adapter.load(payload));
		// 	})
		// 	return Promise.all(promises)
        // }, [initialPayload, payload]);


        if(glTFFormat) {
			let createBinary = glTFFormat == 'glb';
			await page.evaluate(function(createBinary) {
				var adapter = sap.ui.getCore().byId('vb-adapter');
				return adapter.exportGLTF(createBinary)
			}, createBinary).then(data => {
				console.log("glTF creation successful");
                //console.log(data);
                glTFData = data;
				if(createBinary) {
					//TODO: Not working properly
					console.log(JSON.stringify(data));
					//convert base64 result back to binary for writing to file
					//data = atob(data);
				}
				//var filename = workingDir + gltf;
				//fs.writeFileSync(filename, data);	
			}).catch(reason => {
				console.log(reason);
			});
		}

		//Take a screenshot of the page and return as base64 encoded string
		await page.screenshot({
			omitBackground: true,
			encoding: "base64",
			//path: workingDir + output, // in not provided then not saved to disk
			clip:{
				x: 0,
				y: 0,
				width: width,
				height: height
			}
		}).then(function(base64){
            //console.log(base64);
            let responseObject = null;
            switch(resultType){
                case 'html':
                    res.type('html');
                    responseObject = '<img src="data:image/png;base64, ' + base64 + '" alt="' + identifier + '" />';
                    break;
                case 'deferred':
                    res.type('json');
                    responseObject = {
                        operation: "/scene/export/:key/:width/:height/:resultType?",
                        phase: "EXECUTE",
                        state: "SUCCESS",
                        identifier: identifier,
                        output: {
                            image: {
                                type: 'png'
                            }
                        }
                    };

                    // Write the data to the in memory cache
                    global.cache[identifier] = {
                        image: {
                            header : 'image/png',
                            data: base64
                        }
                    }

                    if (glTFData) {
                        responseObject.output["gltf"] = {
                            type: glTFFormat
                        };
                        
                        global.cache[identifier]["gltf"] = {
                                header : glTFFormat == 'glb' ? 'model/gltf-binary' : 'model/gltf+json',
                                data: glTFData
                        }
                    }
                    break;
                case 'json':
                default: 
                    res.type('json');
                    responseObject = {
                        operation: "/scene/export/:key/:width/:height/:resultType?",
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

                    if (glTFData) {
                        responseObject.output["gltf"] = {
                            type: glTFFormat,
                            data: glTFData
                        }
                    }
            }
            res.send(responseObject);
        });

        // free up resources
		console.log('screenshot has been taken')
		await browser.close()
        console.log('browser has been closed')
    })(key, width, height, payload, initialPayload, res, resultType, identifier);
    }
});

// Clear the current scene, but reuse the current initial payload
router.get('/scene/clear/:initialKey?', function(req, res){
    //TODO: clear the Viwport and reset the initial payload if required. 
    res.send("/maptile/hana/caps");
});

// Gets the stored asset for the given key
router.get('/scene/export/:identifier/:outputType/:keep?', function(req, res){
    var atob = require('atob');
    let cacheObject;
    let keepAsset = req.params.keep == "true"; //if undefined then = false
    let identifier = req.params.identifier;
    let outputType = req.params.outputType;
    let returnObject = {
        operation: "/scene/export/:identifier/:outputType",
        phase: "EXECUTE",
        state: "FAILURE",
        identifier: identifier,
        messages: []
    }
    let hasErrors = false; 
    if(identifier) {
        // Get the data
        cacheObject = global.cache[identifier];
        if(cacheObject && cacheObject[outputType]) {
            returnObject = cacheObject[outputType];

            if(returnObject.header.toLowerCase().endsWith('json')) {
                res.set('Content-Type', returnObject.header);
                res.set('Content-Length', returnObject.data.length);
                res.end(returnObject.data); 
            } else {
                const imageBuffer = Buffer.from(returnObject.data, 'base64');
                res.set('Content-Type', returnObject.header);
                res.set('Content-Length', imageBuffer.length);
                res.end(imageBuffer); 
            }

            //Delete asset from cache (default behaviour)
            if(!keepAsset) {
                delete  global.cache[identifier][outputType];
            }

        } else {
            hasErrors = true; 
            returnObject.messages.push(cacheObject ? "outputType " + outputType + " does not exist" : "No cache object for identifier " + identifier);
            console.log(cacheObject);
        }
    } else {
        hasErrors = true;
        returnObject.messages.push("No identifier provided");
    }
 
    if(hasErrors) {
        res.set('json');
        res.send(returnObject);
    }
});


// POST method route
// Creates a new 'session' using the initial payload posted to the endpoint. 
router.post('/scene/setinitial/:key/', function (req, res) {
    if(!req.body.initialPayload) {
        res.type('json');
        res.send({
            operation: "/scene/setinitial/:key/",
            phase: "VALIDATION",
            state: "ERROR",
            data: req.body,
            errorMessages: 'No intial payload provided'
        });
    } else { 
        var payload = req.body.initialPayload
        var key = req.params.key || "default";
        global.initialPayloads[key] = payload;
        res.type('json');
        res.send({
            operation: "/scene/setinitial/:key/",
            phase: "EXECUTE",
            state: "SUCCESS",
            data: {key: key, dataLength:payload.length}
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