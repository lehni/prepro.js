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

// We need to use the parent's require() method.
var parent = module.parent;

// Change __dirname and __filename to the values of the parent.
global.__dirname = path.dirname(parent.filename);
global.__filename = parent.filename;

// Create a fake require method that redirects to the parent.
global.require = function(uri) {
	return parent.require(uri);
};

// Expose require properties through this fake require() method.
global.require.extensions = require.extensions;
global.require.cache = require.cache;
global.require.resolve = require.resolve;

global.include = function(file, options) {
	var filename = path.resolve(global.__dirname, file),
		source = fs.readFileSync(filename, 'utf8'),
		// For relative includes, we save the current directory and then add
		// the uri directory to dirname:
		prevDirname = global.__dirname;
	// If asked to not export, deactivate exporting locally
	if (options && options.exports === false) {
		global.module = global.exports = undefined;
	} else {
		global.module = parent;
		global.exports = parent.exports;
	}
	global.__dirname = path.dirname(filename);
	global.__filename = filename;
	vm.runInThisContext(source, filename);
	global.__dirname = prevDirname;
};

exports.include = global.include;

exports.setup = function(func) {
	var res = func();
	// Merge returned object into global scope.
	for (var key in res) {
		var value = res[key],
			cur = global[key];
		if (cur && typeof cur === 'object' && typeof value === 'object') {
			value = extend(true, cur, value);
		}
		global[key] = value;
	}
};
