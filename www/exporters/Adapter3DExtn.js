/*
 * ! ${copyright}
 */

// Provides class sap.ui.vbm.Adapter3D
sap.ui.define([
	"jquery.sap.global", "sap/ui/vbm/Adapter3D"
], function(jQuery, Adapter3D) {
	"use strict";

	var thisModule = "exporter.Adapter3DExtn";
	/**
	 * Constructor for a new Visual Business Adapter 3D.
	 *
	 * @class
	 * Extends {@link sap.ui.vbm.Adapter3D sap.ui.vbm.Adapter3D } with the ability to export the scene as glTF.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new object
	 * @author SAP SE
	 * @version ${version}
	 * @extends sap.ui.vbm.Adapter3D
	 * @constructor
	 * @public
	 * @alias exporter.Adapter3DExtn
	 */
	var Adapter3DExtn = Adapter3D.extend("exporter.Adapter3DExtn", /** @lends exporter.Adapter3DExtn.prototype */ {
		metadata: {
		}
	});

	Adapter3DExtn.prototype.init = function() {
		// define variable for control initial loading handling
		this._bInitialLoading = true;

		// execute standard control method
		sap.ui.vbm.Adapter3D.prototype.init.apply(this, arguments);

		// variable to hold exporter instance 
		this._exporter = null;
	};

	Adapter3DExtn.prototype.setExporter = function(exporter) {
		this._exporter = exporter;
		return this;
	};

	 /**
	 * TODO
	 * @param {object} exporter ThreeJS Exporter to use.
	 * @returns {Promise} A Promise object that is resolved when the file is ready.
	 * @public
	 */
	Adapter3DExtn.prototype.exportGLTF = function(isGlb) { 
		var that = this;
		return new Promise(function(resolve, reject) {
			var options = {binary: isGlb}; 
			var sceneRef = that._viewport.getScene();

			// Parse the input and generate the glTF output
			that._exporter.parse(sceneRef, function ( result ) {
				if(!isGlb) {
					result = JSON.stringify( result, null, 2 );
				} else if(result.buffers) {
					result = result.buffers[0].uri;
				}
				resolve(result);
			}, options );
		})
	};

	return Adapter3DExtn;
});
