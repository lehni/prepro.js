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

// Required libs

var fs = require('fs'),
	vm = require('vm'),
	path = require('path'),
	uncomment = require('uncomment');

// Preprocessing

var code = [],
	files = [],
	context = vm.createContext({
		options: {}
	});

exports.setOptions = function(obj) {
	// Merge new definitions into options object.
	for (var key in obj)
		if (obj.hasOwnProperty(key))
			context.options[key] = obj[key];
};

exports.include = function(file, evaluate) {
	var content = fs.readFileSync(file).toString();
	content.split(/\r\n|\n|\r/mg).forEach(function(line) {
		// See if our line starts with the preprocess prefix.
		var match = line.match(/^\s*\/\*#\*\/\s*(.*)$/);
		if (match) {
			// Check if the preprocessing line is an include statement, and if
			// so, handle it straight away
			line = match[1];
			if (match = line.match(/^include\(['"]([^;]*)['"]\);?$/)) {
				// Compose full path out of dirname of the current file and
				// include() statement:
				exports.include(path.normalize(
						path.join(path.dirname(file), match[1])));
			} else {
				// Any other preprocessing code is simply added, for later 
				// evaluation.
				code.push(line);
			}
		} else {
			// Perhaps we need to replace some values? Supported formats are:
			// /*#=*/ eval (outside comments)
			// *#=* eval (inside comments)
			line = line.replace(/\/?\*#=\*\/?\s*([\w.]*)/g,
				function(all, val) {
					return vm.runInContext(val, context);
				}
			);
			// Now add a statement that when evaluated writes out this code line
			code.push('out.push(' + JSON.stringify(line) + ');');
		}
	});
	// Evaluate the included straight away (e.g. for options), if told to do so:
	// now:
	if (evaluate) {
		vm.runInContext(exports.process(), context);
	}
};

exports.process = function(settings) {
	context.out = [];
	// Evaluate the collected code: Collects result in out, through out.push() 
	vm.runInContext(code.join('\n'), context);
	// Start again with a new code buffer.
	code = [];
	// Return the resulting lines as one string.
	var res = context.out.join('\n');
	if (settings && settings.uncomment)
		res = uncomment(res);
	return res;
};
