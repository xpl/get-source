# get-source

Platform-agnostic source code inspection, with sourcemaps support.

```bash
npm install get-source
```

## Features

- [x] Allows to read source code files in Node and browsers
- [x] Full sourcemap support (path resolving, external/embedded linking and long chains)
- [x] **Synchronous** API — which is good when you implement a debugging tool (e.g. logging)
- [x] Built-in cache

## What for

- [x] Call stacks enhanced with source code information (see [StackTracey](https://github.com/xpl/stacktracey) library)
- [x] Advanced logging / assertion printing

## Usage

```javascript
getSource = require ('get-source')
```

Will read `./scripts/index.min.js` synchronously (either via XHR, or by filesystem API, depending on the environment):

```javascript
file = getSource ('./scripts/index.min.js')
```

Result will contain following fields:

```javascript
file.path  // normalized file path
file.text  // text contents
file.lines // array of lines
```

And following methods:

```javascript
file.resolve ({ line: 1, column: 8 }) // indexes here start from 1 (by widely accepted convention). Zero indexes are invalid.
```

It will look through the sourcemap chain, returning following:

```
{
   line:       <original line number>,
   column:     <original column number>,
   sourceFile: <original source file object>
   sourceLine: <original source line text, trimmed>
}
```

In that returned object, `sourceFile` is the same kind of object that `getSource` returns. So you can access its `text`, `lines` and `path` fields to obtain the full information. And the `sourceLine` is returned just for the convenience, as a shortcut.

## Error handling

In case of a nonexistent file:

```
nonsense = getSource ('/some/nonexistent/file')

nonsense.text  // should be '' (so it's safe to access without checking)
nonsense.error // should be Error object, representing an actual error thrown during reading/parsing
```

Calling `resolve` on an erroneous file:

```
resolved = nonsense.resolve ({ line: 5, column: 0 })

resolved.error      // should be Error object, representing an actual error thrown during reading/parsing
resolved.sourceLine // empty string (so it's safe to access without checking)
```