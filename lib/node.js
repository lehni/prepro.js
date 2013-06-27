/**
 * prepro.js - A JavaScript based preprocesssor language for JavaScript
 *
 * Copyright (c) 2011 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * prepro.js is a simple preprocesssor for JavaScript that speaks JavaScript,
 * written in JavaScript, allowing preprocessing to either happen at build time
 * or compile time. It is very useful for libraries that are built for
 * distribution, but can be also compiled from seperate sources directly for
 * development, supporting build time switches.
 *
 * Distributed under the MIT license.
 */

var fs = require('fs'),
	vm = require('vm'),
	path = require('path');

// We need to use the parent's require() method
var parent = module.parent;

// Create the context within which we will run the source files:
var context = vm.createContext({
	// Used to load and run source files within the same context:
	include: function(file, settings) {
		var filename = path.resolve(context.__dirname, file),
			source = fs.readFileSync(filename, 'utf8'),
			// For relative includes, we save the current directory and then
			// add the uri directory to dirname:
			prevDirname = context.__dirname;
		// If asked to not export, deactivate exporting locally
		if (settings && settings.exports === false) {
			context.module = context.exports = undefined;
		} else {
			context.module = parent;
			context.exports = parent.exports;
		}
		context.__dirname = path.dirname(filename);
		context.__filename = filename;
		vm.runInContext(source, context, filename);
		context.__dirname = prevDirname;
	},
	// Expose core methods and values
	__dirname: path.dirname(parent.filename),
	__filename: parent.filename,
	// Create a fake require method that redirects to the parent.
	require: function(uri) {
		return parent.require(uri);
	},
    console: console,
	options: {}
});

// Expose require properties through fake require() method
context.require.extensions = require.extensions;
context.require.cache = require.cache;
context.require.resolve = require.resolve;

exports.setOptions = function(obj) {
	// Merge new definitions into options object.
	for (var key in obj)
		if (obj.hasOwnProperty(key))
			context.options[key] = obj[key];
};

exports.include = function(file, settings) {
	context.include(file, settings);
};

exports.context = context;

