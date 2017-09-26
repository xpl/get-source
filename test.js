"use strict";

/*  NOTE: I've used supervisor to auto-restart mocha, because mocha --watch
          didn't work for selenium tests (not reloading them)...
          ------------------------------------------------------------------ */
                    
require ('chai').should ()

/*  ------------------------------------------------------------------------ */

describe ('path', () => {

    const path = require ('./impl/path')

    it ('resolves', () => {

        path.resolve ('./foo/bar/../qux').should.equal (process.cwd () + '/foo/qux')
    })

    it ('normalizes', () => {

        path.normalize ('./foo/./bar/.././.././qux.map./').should.equal ('qux.map./')

        path.normalize ('/a/b').should.equal ('/a/b')
        path.normalize ('http://foo/bar').should.equal ('http://foo/bar')
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

    it ('works with data URIs', () => {

        path.relativeToFile ('/foo/bar.js', 'data:application/json;charset=utf-8;base64,eyJ2ZXJza==')
              .should.equal (               'data:application/json;charset=utf-8;base64,eyJ2ZXJza==')

        path.relativeToFile ('data:application/json;charset=utf-8;base64,eyJ2ZXJza==', 'foo.js')
              .should.equal (                                                          'foo.js')
    })
})

/*  ------------------------------------------------------------------------ */

describe ('get-source', () => {

    const getSource = require ('./get-source'),
          fs        = require ('fs'),
          path      = require ('path')

    it ('caches read files', () => {

        getSource ('./test.js').should.equal     (getSource ('./test.js'))
        getSource ('./test.js').should.not.equal (getSource ('./package.json'))
    })

    it ('reads sources (not sourcemapped)', () => {

        const original = getSource ('./test_files/original.js')

        original.path.should.equal (path.resolve ('./test_files/original.js')) // resolves input paths
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

        uglified.path.should.equal (path.resolve ('./test_files/original.uglified.js'))
        uglified.lines.should.deep.equal ([
            'function hello(){return"hello world"}',
            '//# sourceMappingURL=original.uglified.js.map',
            ''
        ])

        uglified.sourceMap.should.not.equal (undefined)
        uglified.sourceMap.should.equal (uglified.sourceMap) // memoization should work

        const resolved = uglified.resolve ({ line: 1, column: 18 }) // should be tolerant to column omission

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.should.equal (getSource ('./test_files/original.js'))
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('reads sources (sourcemapped, with embedded sources)', () => {

        const uglified = getSource ('./test_files/original.uglified.with.sources.js')

        uglified.path.should.equal (path.resolve ('./test_files/original.uglified.with.sources.js'))
        uglified.lines.should.deep.equal ([
            'function hello(){return"hello world"}',
            '//# sourceMappingURL=original.uglified.with.sources.js.map',
            ''
        ])

        uglified.sourceMap.should.not.equal (undefined)

        const resolved = uglified.resolve ({ line: 1, column: 18 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.path.should.equal (path.resolve ('./test_files') + '/## embedded ##') // I've changed the filename manually, by editing .map file
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('reads sources (sourcemapped, with inline base64 sourcemaps)', () => {

        const babeled = getSource ('./test_files/original.babeled.with.inline.sourcemap.js')

        babeled.sourceMap.should.not.equal (undefined)
        babeled.sourceMap.file.path.should.equal (babeled.path)

        const resolved = babeled.resolve ({ line: 6, column: 1 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceLine.should.equal ('\treturn \'hello world\' }')
    })

    it ('supports even CHAINED sourcemaps!', () => {

    /*  original.js → original.uglified.js → original.uglified.beautified.js    */

        const beautified = getSource ('./test_files/original.uglified.beautified.js')

        beautified.path.should.equal (path.resolve ('./test_files/original.uglified.beautified.js'))
        beautified.text.should.equal (fs.readFileSync ('./test_files/original.uglified.beautified.js', { encoding: 'utf-8' }))

        beautified.sourceMap.should.not.equal (undefined)

        const resolved = beautified.resolve ({ line: 2, column: 4 })

        resolved.line.should.equal (4)
        resolved.column.should.equal (1)
        resolved.sourceFile.path.should.equal (path.resolve ('./test_files/original.js'))
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

    it ('allows absolute paths', () => {

        getSource (require ('path').resolve ('./test.js')).should.equal (getSource ('./test.js'))
    })

    it ('caching works', () => {
        
        const files =
                [   './test.js',
                    './package.json',
                    './test_files/original.js',
                    './test_files/original.uglified.js',
                    './test_files/original.uglified.js.map',
                    './test_files/original.uglified.with.sources.js',
                    './test_files/original.uglified.with.sources.js.map',
                    './test_files/original.babeled.with.inline.sourcemap.js',
                    './test_files/original.uglified.beautified.js',
                    './test_files/original.uglified.beautified.js.map',
                    './abyrvalg' ]
            
        Object.keys (getSource.getCache ()).should.deep.equal (files.map (x => path.resolve (x)))

        getSource.resetCache ()

        Object.keys (getSource.getCache ()).length.should.equal (0)
    })
})

/*  TODO: should find a way to run all tests within both Node and
          ChromeDriver automatically...
          ------------------------------------------------------------------ */

const selenium = require ('selenium-webdriver/testing')

/*  ------------------------------------------------------------------------ */

selenium.describe ('Chrome test', (done) => {

    const webdriver = require ('selenium-webdriver'),
          path      = require ('path'),
          fs        = require ('fs'),
          memFS     = new (require ('memory-fs')) (),
          it        = selenium.it,
          webpack   = require ('webpack'),
          logging   = require ('selenium-webdriver/lib/logging')

    let driver

/*  Prepare ChromeDriver (with CORS disabled and log interception enabled)   */

    selenium.before (() => driver =
                            new webdriver
                                    .Builder ()
                                    .withCapabilities (
                                        webdriver.Capabilities
                                                 .chrome ()
                                                 .setLoggingPrefs (new logging.Preferences ().setLevel (logging.Type.BROWSER, logging.Level.ALL))
                                                 .set ('chromeOptions', {
                                                          'args': ['--disable-web-security'] }))
                                    .build ())

    selenium.after  (() => driver.quit ())

    it ('works', async () => {

    /*  Compile get-source   */

        const compiledScript = await (new Promise (resolve => { Object.assign (webpack ({ 

                entry: './test_files/get-source.webpack.entry.js',
                output: { path: '/', filename: 'get-source.webpack.compiled.js' },
                plugins: [ new webpack.IgnorePlugin(/^fs$/) ]

            }), { outputFileSystem: memFS }).run ((err, stats) => {

                if (err) throw err

                resolve (memFS.readFileSync ('/get-source.webpack.compiled.js').toString ('utf-8'))
            })
        }))

    /*  Inject it into Chrome   */

        driver.get ('file://' + path.resolve ('./test.html'))
        driver.executeScript (compiledScript)

    /*  Execute test    */

        const exec = fn => driver.executeScript (`(${fn.toString ()})()`)

        try {

            await exec (function () {

                path.relativeToFile ('http://foo.com/scripts/bar.js', '../bar.js.map')
                      .should.equal ('http://foo.com/bar.js.map')

                path.relativeToFile ('http://foo.com/scripts/bar.js', 'http://bar.js.map')
                      .should.equal ('http://bar.js.map')

                path.relativeToFile ('http://foo.com/scripts/bar.js', '/bar.js.map')
                      .should.equal ('file:///bar.js.map')

                var loc = getSource ('../test_files/original.uglified.beautified.js').resolve ({ line: 2, column: 4 })

                loc.line.should.equal (4)
                loc.column.should.equal (1)
                loc.sourceFile.path.should.contain ('test_files/original.js')
                loc.sourceLine.should.equal ('\treturn \'hello world\' }')
            })

        } catch (e) { throw e } finally {

            driver.manage ().logs ().get (logging.Type.BROWSER).then (entries => {
                entries.forEach (entry => {
                    console.log('[BROWSER] [%s] %s', entry.level.name, entry.message);
                })
            })
        }

    })

})

// /*  ------------------------------------------------------------------------ */
