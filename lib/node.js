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
// Create the context within which we will run the source files, inheriting from
// the global scope:
var scope = Object.create(global);

// Set up __dirname and __filename based on the parent module.
// NOTE: This isn't always right, e.g. when prepro is used in conjunction with
// the node-qunit module. We have a fall-back for this scenario in the include()
// method below.
scope.__dirname = path.dirname(parent.filename);
scope.__filename = parent.filename;
scope.module = parent;
scope.exports = parent.exports;

// Create a fake require method that redirects to the parent module.
scope.require = function(uri) {
	// If the uri is relative, resolve it in relation to the context's current
	// __dirname, otherwise pass it on directly to the parent module's require:
	return parent.require(/^\./.test(uri)
			? path.resolve(context.__dirname, uri) : uri);
};

// Expose require properties through fake require() method
scope.require.extensions = require.extensions;
scope.require.cache = require.cache;
scope.require.resolve = require.resolve;

// Used to load and run source files within the same context:
scope.include = function(uri) {
	var filename = path.resolve(context.__dirname, uri),
		source;
	// Try loading the file first.
	try {
		source = fs.readFileSync(filename, 'utf8');
	} catch (e) {
		// If we fail, then __dirname is wrong and we need to loop through the
		// other sibling modules until we find the right directory. As a
		// convention, the file loading through Prepro.js should be called
		// load.js, which then can be found here:
		var children = parent.children;
		// Start at the back as that's the most likely place for the including
		// module to be found.
		for (var i = children.length - 1; i >= 0; i--) {
			try {
				var child = children[i];
				if (/load.js$/.test(child.id)) {
					var dirname = path.dirname(child.id);
					filename = path.resolve(dirname, uri);
					source = fs.readFileSync(filename, 'utf8');
					// If we're still here, the file exists in which case we can
					// set the new __dirname.
					context.__dirname = dirname;
					break;
				}
			} catch (e) {
				// Keep on trying.
			}
		}
	}
	// For relative includes, we save the current directory and then add the
	// uri to __dirname:
	var prevDirname = context.__dirname;
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

