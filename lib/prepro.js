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

function Prepro() {
	// Support both `new Prepro()` and `Preprop()`:
	if (this.constructor !== Prepro)
		return new Prepro();

	var code = [],
		files = [],
		scope = {},
		context = vm.createContext(scope);

	this.evaluate = function(file) {
		this.include(file);
		// Evaluate the included code:
		vm.runInContext(this.preprocess(), context);
	};

	this.setup = function(func) {
		var res = func.call(scope, scope);
		if (res) {
			extend(true, scope, res);
		}
	};

	this.process = function(file) {
		this.include(file);
		return this.preprocess();
	};

	this.preprocess = function() {
		context.out = [];
		// Evaluate the collected code: Collects result in out, through
		// out.push()
		vm.runInContext(code.join('\n'), context);
		// Start again with a new code buffer.
		code = [];
		// Return the resulting lines as one string.
		return context.out.join('\n');
	};

	this.include = function include(file) {
		var content = fs.readFileSync(file).toString();
		content.split(/\r\n|\n|\r/mg).forEach(function(line) {
			// See if our line starts with the preprocess prefix.
			var match = line.match(/^\s*\/\*#\*\/\s*(.*)$/);
			if (match) {
				// Check if the preprocessing line is an include statement, and
				// if so, handle it straight away
				line = match[1];
				// Include statements can have an optinonal settinsg object
				// argument
				match = line.match(
						/^include\(['"]([^;]*)['"](?:,([^)]*)|)\);?$/);
				if (match) {
					// Compose full path out of dirname of the current file and
					// include() statement:
					var opts = match[2];
					if (opts) {
						/* jshint -W061 */
						eval('opts = ' + opts);
					}
					include(path.normalize(
							path.join(path.dirname(file), match[1])), opts);
				} else {
					// Any other preprocessing code is simply added, for later 
					// evaluation.
					code.push(line);
				}
			} else {
				// Do we need to replace some values? Supported formats are:
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
				// Add a statement that when evaluated writes out this code line
				code.push('out.push(' + JSON.stringify(line) + ');');
			}
		});
	};
}

module.exports = Prepro;
