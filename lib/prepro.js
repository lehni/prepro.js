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
		__options: {}
	});

exports.setOptions = function(obj) {
	// Merge new definitions into __options object.
	for (var key in obj)
		if (obj.hasOwnProperty(key))
			context.__options[key] = obj[key];
};

exports.include = function(file, settings) {
	var content = fs.readFileSync(file).toString();
	content.split(/\r\n|\n|\r/mg).forEach(function(line) {
		// See if our line starts with the preprocess prefix.
		var match = line.match(/^\s*\/\*#\*\/\s*(.*)$/);
		if (match) {
			// Check if the preprocessing line is an include statement, and if
			// so, handle it straight away
			line = match[1];
			// Include statements can have an optinonal settinsg object argument
			if (match = line.match(/^include\(['"]([^;]*)['"](?:,([^)]*)|)\);?$/)) {
				// Compose full path out of dirname of the current file and
				// include() statement:
				var settings = match[2];
				if (settings)
					eval('settings = ' + settings);
				exports.include(path.normalize(
						path.join(path.dirname(file), match[1])), settings);
			} else {
				// Any other preprocessing code is simply added, for later 
				// evaluation.
				code.push(line);
			}
		} else {
			// Perhaps we need to replace some values? Supported formats are:
			// /*#=*/ eval (outside comments)
			// *#=* eval (inside comments)
			// with eval being either:
			// - OBJECT.valueToEvaluate
			// - (OBJECT.expressionToEvaluate | OBJECT.somethingElse ...)
			line = line.replace(/(\/?)\*#=\*\/?\s*(\([^)]*\)|[\w.]*)/g,
				function(all, outside, val) {
					var res = vm.runInContext(val, context),
						type = typeof res;
					switch (type) {
					case 'number':
						// See if we can shorten the number using the
						// exponential notation:
						var exp = res.toExponential();
						if (exp.length < res.toString().length)
							res = exp;
						break;
					case 'string':
						// Only stringify if we're outside comments
						if (outside)
							res = JSON.stringify(res);
						break;
					}
					return res;
				}
			);
			// Now add a statement that when evaluated writes out this code line
			code.push('out.push(' + JSON.stringify(line) + ');');
		}
	});
	// Evaluate the included straight away (e.g. for __options), if told to do
	// so now:
	if (settings && settings.evaluate)
		vm.runInContext(exports.process(), context);
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
	// Remove multiple line-breaks at the end of the file.
	res = res.replace(/(\r\n|\n|\r)(?:\r\n|\n|\r)+$/g, function(all, lineBreak) {
		return lineBreak;
	});
	return res;
};
