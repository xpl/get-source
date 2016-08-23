"use strict";

/*  ------------------------------------------------------------------------ */

const path = module.exports = {

    concat: (a, b) => {

                const a_endsWithSlash = (a[a.length - 1] === '/'),
                	  b_startsWithSlash = (b[0] === '/')

                return a + ((a_endsWithSlash || b_startsWithSlash) ? '' : '/') +
                           ((a_endsWithSlash && b_startsWithSlash) ? b.substring (1) : b) },

	normalize: path => {

		let output = [],
		    skip = 0

		path.split ('/').reverse ().filter (x => x !== '.').forEach (x => {

			     if (x === '..') { skip++ }
			else if (skip === 0) { output.push (x) }
			else                 { skip-- }
		})

		return output.reverse ().join ('/')
	},

	relativeToFile: (a, b) => {
	    return path.normalize (path.concat (a.split ('/').slice (0, -1).join ('/'), b))
	}
}

/*  ------------------------------------------------------------------------ */
