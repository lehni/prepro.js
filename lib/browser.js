/**
 * prepro.js - A JavaScript based preprocesssor language for JavaScript
 *
 * Copyright (c) 2011 - 2016 Juerg Lehni
 * http://scratchdisk.com/
 *
 * prepro.js is a simple preprocesssor for JavaScript that speaks JavaScript,
 * written in JavaScript, allowing preprocessing to either happen at build time
 * or compile time. It is very useful for libraries that are built for
 * distribution, but can be also compiled from seperate sources directly for
 * development, supporting build time switches.
 *
 * Distributed under the MIT license.
 */

function getScript() {
	var scripts = document.getElementsByTagName('script');
	return scripts[scripts.length - 1].getAttribute('src');
}

// Since loading browser.js is also used further down to prevent inline scripts
// from executing right away, check that its actual code is only executed once.
if (!window.include) {
	var main = getScript();
	// Determine the source of browser.js, so we can use it to prevent inline
	// scripts from loading straight away by.
	var root = main.match(/^(.*\/)node_modules\/prepro\/lib\//)[1];
	var current = root;

	window.include = function(url) {
		// Determine the base of the currently executing script, in. We need to
		// filter out inline and reinserted browser.js scripts (see below).
		var src = getScript();
		if (!src) {
			current = root;
		} else if (src !== main) {
			current = src;
		}
		var base = (current.match(/^(.*\/)/) || ['',''])[1];
		document.write([
			// Reinsert the browser.js script again, to delay loading of script
			// at url, and keep loading sequence synchronized.
			'<script type="text/javascript" src="', main, '"></script>',
			'<script type="text/javascript" src="', base + url, '"></script>'
		].join(''));
	};
}
