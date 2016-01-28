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
// Create the context within which we will run the source files, inheriting from
// the global scope:
var scope = Object.create(global);

// Set up __dirname and __filename based on the parent module.
// NOTE: This isn't always right, e.g. when prepro is used in conjunction with
// the node-qunit module. We have a fall-back for this scenario in the include()
// method below.
scope.__dirname = path.dirname(parent.filename);
scope.__filename = parent.filename;

// Create a fake require method that redirects to the parent.
scope.require = function(uri) {
	return parent.require(/^\./.test(uri)
			? path.resolve(context.__dirname, uri) : uri);
};

// Expose require properties through fake require() method
scope.require.extensions = require.extensions;
scope.require.cache = require.cache;
scope.require.resolve = require.resolve;

// Used to load and run source files within the same context:
scope.include = function(file) {
	// Try loading the file first.
	try {
		var filename = path.resolve(context.__dirname, file),
			source = fs.readFileSync(filename, 'utf8'),
			// For relative includes, we save the current directory and then add
			// the uri directory to dirname:
			prevDirname = context.__dirname;
	} catch (e) {
		// If we fail, then __dirname is wrong and we need to loop through the
		// other sibling modules until we find the right directory. As a
		// convention, the file loading through Prepro.js should be called
		// load.js, which then can be found here:
		var children = parent.children;
		for (var i = children.length - 1; i >= 0; i--) {
			var child = children[i];
			if (/load.js$/.test(child.id)) {
				context.__dirname = path.dirname(child.id);
				filename = path.resolve(context.__dirname, file);
				source = fs.readFileSync(filename, 'utf8');
				break;
			}
		}
	}
	context.module = parent;
	context.exports = parent.exports;
	context.__dirname = path.dirname(filename);
	context.__filename = filename;
	vm.runInContext(source, context, filename);
	context.__dirname = prevDirname;
	return parent.exports;
};

var context = vm.createContext(scope);

exports.include = function(file, options) {
	var exports = context.include(file),
		namespace = options && options.namespace;
	if (namespace)
		context[namespace] = exports;
	return exports;
};

exports.setup = function(func) {
	var res = func.call();
	if (res) {
		extend(true, scope, res);
	}
};

exports.context = context;

