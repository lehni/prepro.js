/**
 * Prepro.js - A JavaScript based preprocesssor language for JavaScript
 *
 * Copyright (c) 2011 - 2016 Juerg Lehni
 * http://scratchdisk.com/
 *
 * Prepro.js is a simple preprocesssor for JavaScript that speaks JavaScript,
 * written in JavaScript, allowing preprocessing to either happen at build time
 * or compile time. It is very useful for libraries that are built for
 * distribution, but can be also compiled from separate sources directly for
 * development, supporting build time switches.
 *
 * Distributed under the MIT license.
 */

var fs = require('fs'),
	vm = require('vm'),
	path = require('path'),
	extend = require('extend');

// We need to use the parent's require() method
var parent = module.parent;
// Create the context within which we will run the source files:
var scope = Object.create(global);

// Expose core methods and values
scope.__dirname = path.dirname(parent.filename);
scope.__filename = parent.filename;

// Create a fake require method that redirects to the parent.
scope.require = function(uri) {
	return parent.require(uri);
};
// Expose require properties through fake require() method
scope.require.extensions = require.extensions;
scope.require.cache = require.cache;
scope.require.resolve = require.resolve;

// Used to load and run source files within the same context:
scope.include = function(file, options) {
	var filename = path.resolve(context.__dirname, file),
		source = fs.readFileSync(filename, 'utf8'),
		// For relative includes, we save the current directory and then add
		// the uri directory to dirname:
		prevDirname = context.__dirname;
	// If asked to not export, deactivate exporting locally
	if (options && options.exports === false) {
		context.module = context.exports = undefined;
	} else {
		context.module = parent;
		context.exports = parent.exports;
	}
	context.__dirname = path.dirname(filename);
	context.__filename = filename;
	vm.runInContext(source, context, filename);
	context.__dirname = prevDirname;
};

var context = vm.createContext(scope);

exports.include = function(file, options) {
	context.include(file, options);
};

exports.setup = function(func) {
	var res = func.call(scope, scope);
	if (res) {
		extend(true, scope, res);
	}
};

exports.context = context;

