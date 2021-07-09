# Notes on `settings.json`

## `javascript.validate.enable: false`

`javascript.validate.enable` is set to `false` to hide this suggestion from VSCode:

> File is a CommonJS module; it may be converted to an ES6 module.ts(80001)

Most tools that read `.js` config files don't support ES6 modules yet. ES6 modules are mostly used with babel and in my case most likely with TypeScript. So there is generally no need to warn this for any `.js` files.
