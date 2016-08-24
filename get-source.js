"use strict";

/*  ------------------------------------------------------------------------ */

const O                 = Object,
      isBrowser         = (typeof window !== 'undefined') && (window.window === window) && window.navigator,
      SourceMapConsumer = require ('source-map').SourceMapConsumer,
      path              = require ('./impl/path'),
      memoize           = require ('lodash.memoize'),
      lastOf            = x => x[x.length - 1]

/*  ------------------------------------------------------------------------ */

const newSourceFileMemoized = memoize (file => new SourceFile (file))

const getSource = module.exports = file => { return newSourceFileMemoized (path.resolve (file)) }

/*  ------------------------------------------------------------------------ */

class SourceMap {

    constructor (originalFilePath, sourceMapPath) {

        this.file      = getSource (path.relativeToFile (originalFilePath, sourceMapPath))
        this.parsed    = (this.file.text && SourceMapConsumer (JSON.parse (this.file.text))) || null
        this.sourceFor = memoize (this.sourceFor.bind (this))
    }

    sourceFor (file) {
        const content = this.parsed.sourceContentFor (file, true /* return null on missing */)
        const fullPath = path.relativeToFile (this.file.path, file)
        return content ? new SourceFile (fullPath, content) : getSource (fullPath)
    }

    resolve (loc) {

        const originalLoc = this.parsed.originalPositionFor (loc)
        return originalLoc.source ? this.sourceFor (originalLoc.source)
                                        .resolve (O.assign ({}, loc, {
                                            line: originalLoc.line,
                                            column: originalLoc.column,
                                            name: originalLoc.name })) : loc
    }
}

/*  ------------------------------------------------------------------------ */

class SourceFile {

    constructor (path, text /* optional */) {

        this.path = path

        if (text) {
            this.text = text }

        else {
            try {
                if (isBrowser) {

                    let xhr = new XMLHttpRequest ()

                        xhr.open ('GET', path, false /* SYNCHRONOUS XHR FTW :) */)
                        xhr.send (null)

                    this.text = xhr.responseText }

                else {
                    this.text = require ('fs').readFileSync (path, { encoding: 'utf8' }) } }

            catch (e) {
                this.error = e
                this.text = '' } }
    }

    get lines () {
        return (this.lines_ = this.lines_ || this.text.split ('\n'))
    }

    get sourceMap () {

        try {
            if (this.sourceMap_ === undefined) {
                let url = this.text.match (/\u0023 sourceMappingURL=(.+\.map)/) // escape #, otherwise it will match this exact line.. %)
                if (url = (url && url[1])) {
                    this.sourceMap_ = new SourceMap (this.path, url) }
                else {
                    this.sourceMap_ = null } } }

        catch (e) {
            this.sourceMapError = e
            this.sourceMap_ = null }

        return this.sourceMap_
    }

    resolve (loc /* { line[, column] } */) /* → { line, column, sourceFile, sourceLine } */ {

        return this.sourceMap ? this.sourceMap.resolve (loc) : O.assign ({}, loc, {

            sourceFile:  this,
            sourceLine: (this.lines[loc.line - 1] || ''),
            error:       this.error
        })
    }
}

/*  ------------------------------------------------------------------------ */
