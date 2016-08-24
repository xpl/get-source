"use strict";

/*  ------------------------------------------------------------------------ */
                    
require ('chai').should ()

/*  ------------------------------------------------------------------------ */

describe ('path', () => {

    const path = require ('./impl/path')

    it ('normalizes', () => {

        path.normalize ('./foo/./bar/.././.././qux.map./').should.equal ('qux.map./')
    })

    it ('computes relative location', () => {

        path.relativeToFile ('/foo/bar.js', './qux.map')
              .should.equal ('/foo/qux.map')

        path.relativeToFile ('/foo/bar/baz.js', './../.././qux.map')
              .should.equal ('/qux.map')

        path.relativeToFile ('/foo/bar', 'webpack:something')
              .should.equal ('webpack:something')

        path.relativeToFile ('/foo/bar', 'web/pack:something')
              .should.equal ('/foo/web/pack:something')
    })
})

/*  ------------------------------------------------------------------------ */

describe ('get-source', () => {

    const getSource = require ('./get-source'),
          fs        = require ('fs')

    it ('caches read files', () => {

        getSource ('./test.js').should.equal     (getSource ('./test.js'))
        getSource ('./test.js').should.not.equal (getSource ('./package.json'))
    })

    it ('reads sources (not sourcemapped)', () => {

        const original = getSource ('./test_files/original.js')

        original.path.should.equal ('test_files/original.js') // normalizes input paths
        original.text.should.equal (fs.readFileSync ('./test_files/original.js', { encoding: 'utf-8' }))
        original.lines.should.deep.equal ([
            '/*\tDummy javascript file\t*/',
            '',
            'function hello () {',
            '\treturn \'hello world\' }'
        ])

        const resolved = original.resolve ({ line: 4, column: 1 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.should.equal (original)
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('reads sources (sourcemapped, with external links)', () => {

        const uglified = getSource ('./test_files/original.uglified.js')

        uglified.path.should.equal ('test_files/original.uglified.js')
        uglified.lines.should.deep.equal ([
            'function hello(){return"hello world"}',
            '//# sourceMappingURL=original.uglified.js.map',
            ''
        ])

        uglified.sourceMap.should.not.equal (undefined)
        uglified.sourceMap.should.equal (uglified.sourceMap) // memoization should work

        const resolved = uglified.resolve ({ line: 1, column: 18 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.should.equal (getSource ('./test_files/original.js'))
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('reads sources (sourcemapped, with embedded sources)', () => {

        const uglified = getSource ('./test_files/original.uglified.with.sources.js')

        uglified.path.should.equal ('test_files/original.uglified.with.sources.js')
        uglified.lines.should.deep.equal ([
            'function hello(){return"hello world"}',
            '//# sourceMappingURL=original.uglified.with.sources.js.map',
            ''
        ])

        uglified.sourceMap.should.not.equal (undefined)

        const resolved = uglified.resolve ({ line: 1, column: 18 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.path.should.equal ('test_files/## embedded ##') // I've changed the filename manually, by editing .map file
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })


    it ('supports even CHAINED sourcemaps!', () => {

    /*  original.js → original.uglified.js → original.uglified.beautified.js    */

        const beautified = getSource ('./test_files/original.uglified.beautified.js')

        beautified.path.should.equal ('test_files/original.uglified.beautified.js')
        beautified.text.should.equal (fs.readFileSync ('./test_files/original.uglified.beautified.js', { encoding: 'utf-8' }))

        beautified.sourceMap.should.not.equal (undefined)

        const resolved = beautified.resolve ({ line: 2, column: 4 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.path.should.equal ('test_files/original.js')
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('does some error handling', () => {

        const nonsense = getSource ('abyrvalg')

        nonsense.text.should.equal ('')
        nonsense.error.should.be.an.instanceof (Error)

        const resolved = nonsense.resolve ({ line: 5, column: 0 })

        resolved.error.should.equal (nonsense.error)
        resolved.sourceLine.should.equal ('')
    })
})



