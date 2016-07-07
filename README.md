# utf8js [![NPM version](https://badge.fury.io/js/utf8js.svg)](https://www.npmjs.com/package/utf8js)
utf8.js is a fast UTF-8 encoder/decoder for JavaScript. It attempts to use native encoding/decoding methods whenever possible. It requires Promises and Typed Arrays, both of which can be polyfilled. On modern computers, when using native methods, the decoding speeds should exceed 100 MiB/s. Encoding should be fast even if native methods are not available.

## API
  - `encode(string: DOMString): Promise<ArrayBuffer>`
  - `decode(buffer: ArrayBuffer): Promise<DOMString>`

> If you can't use asynchronous methods for a given task, you may be able to hack around it. Only the `Blob` codec is truly asynchronous - the rest return an already-resolved `Promise`.

## What, why, how?
To be specific, utf8.js deals with the conversion between UTF-16 `DOMStrings` and UTF-8 `TypedArray`s. There are plenty of existing UNICODE libraries on npm, why write a new one? Well, many existing libraries do not handle large amounts of data well. When dealing with strings or arrays of over 100 MiB of data, transforming the string multiple times is not wise. In fact, it is surprisingly difficult for JavaScript code to construct large strings in the first place, without running out of memory.

That is why this library has numerous implementations, for various cases:

  - `NativeCodec` uses the new `TextEncoder`/`TextDecoder` API and achieves over 300MiB/s on my computer.
  - `BlobCodec` abuses `Blob` objects to go to and from UTF-8 and achieves over 200MiB/s on my computer (even on Internet Explorer 10!)
  - `NodeJSCodec` uses the Node.js-specific `Buffer` API.
  - `JSCodec` is a pure JS codec. Although encoding is quick, decoding is both slow and memory intensive.

For almost any browser IE 10+, native methods will work.

### Why not just polyfill `TextEncoder`/`TextDecoder`?
For similar reasons! A great polyfill exists, but it doesn't support fallback to `Blob`, a very useful thing to have on Internet Explorer 10. I haven't tested but I imagine its pure JS UTF-8 encoding/decoding is probably also not fit for dealing with large amounts of data.

## Browser support
Approximate browser support:

  - Chrome: 32+
  - Firefox: 29+
  - Internet Explorer: 10+
  - Safari: 7.1+

Chrome 7+ and Firefox 4+ should also work when a `Promise` polyfill is present. Internet Explorer requires a `Promise` polyfill, since it still doesn't support `Promise`s. Earlier versions of IE will probably work when provided a `TypedArray` polyfill - at least IE 9 - but do not expect stellar performance or memory usage when dealing with huge strings.

## TODO

  - Testing needed! It would be nice to automate tests across other browsers, but that might be a long way off.
  - Explore options for faster encoding/decoding in IE 9. Perhaps a Microsoft-specific object can be abused to provide efficient decoding?
  - Can DOMStrings be abused to store binary data and UTF-8 data when `TypedArray` is not available? Sure looks like it, but it's obviously very inefficient to mutate.