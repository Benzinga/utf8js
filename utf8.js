// utf8.js - fast UTF-8 encoding/decoding in JS

(function () {
  var utf8 = {};
  var root = this;

  // NativeCodec implements UTF-8 encoding/decoding using native APIs,
  // namely those of TextEncoder/TextDecoder. These APIs are the most
  // efficient.
  function NativeCodec () {}

  NativeCodec.prototype.encode = function (str) {
    return Promise.resolve((new root.TextEncoder()).encode(str));
  };

  NativeCodec.prototype.decode = function (buf) {
    return Promise.resolve((new root.TextDecoder()).decode(buf));
  };

  utf8['NativeCodec'] = NativeCodec;

  // NodeJSCodec implements UTF-8 encoding/decoding using NodeJS APIs.
  function NodeJSCodec () {}

  NodeJSCodec.prototype.encode = function (str) {
    return Promise.resolve(new Uint8Array(new Buffer(str, 'utf8')));
  };

  NodeJSCodec.prototype.decode = function (buf) {
    return Promise.resolve((new Buffer(buf)).toString('utf8'));
  };

  utf8['NodeJSCodec'] = NodeJSCodec;

  // BlobCodec implements UTF-8 encoding/decoding on top of the Blob and
  // FileReader APIs. Performance and memory usage are better than
  // using pure JS, but worse than TextEncoder/TextDecoder.
  function BlobCodec () {}

  BlobCodec.prototype.encode = function (str) {
    var blob = new root.Blob([str], {type: 'text/plain; charset=utf-8'});
    var reader = new root.FileReader();

    return new Promise(function (resolve, reject) {
      reader.onload = function (e) { resolve(reader.result); };
      reader.onerror = function (e) { resolve(reader.error); };
      reader.readAsArrayBuffer(blob);
    });
  };

  BlobCodec.prototype.decode = function (buf) {
    var blob = new root.Blob([buf], {type: 'text/plain; charset=utf-8'});
    var reader = new root.FileReader();

    return new Promise(function (resolve, reject) {
      reader.onload = function (e) { resolve(reader.result); };
      reader.onerror = function (e) { resolve(reader.error); };
      reader.readAsText(blob);
    });
  };

  utf8['BlobCodec'] = BlobCodec;

  // JSCodec implements UTF-8 encoding/decoding on top of DOMString
  // directly. Unfortunately, due to horrible characteristics of strings,
  // it seems impossible to efficiently build strings in JS. JSCodec is a
  // last resort and can take a long time for large arrays (>50 MiB.)
  // --
  // TODO: Performance can likely be improved. There's a lot of branching
  //       that could be removed.
  function JSCodec () {}

  JSCodec.prototype.encode = function (str) {
    var h, l, i, j;

    // Step 1. Preflight
    var len = 0;
    for (i = 0; i < str.length;) {
      h = str.charCodeAt(i++);
      if (h >= 0xD800 && h <= 0xDBFF) {
        if (i + 1 < str.length) {
          l = str.charCodeAt(i++);
          if (l >= 0xDC00 && l <= 0xDFFF) {
            len += 4;
          } else {
            len += 3;
          }
        } else {
          len += 3;
        }
      } else {
        if (h < 0x80) len += 1; else
        if (h < 0x800) len += 2; else
        if (h < 0x10000) len += 3;
      }
    }

    // Step 2. Rewrite :)
    var buf = new Uint8Array(len);
    for (i = 0, j = 0; i < str.length;) {
      h = str.charCodeAt(i++);
      // Handle surrogate pairs.
      if (h >= 0xD800 && h <= 0xDBFF) {
        if (i + 1 < str.length) {
          l = str.charCodeAt(i++);
          if (l >= 0xDC00 && l <= 0xDFFF) {
            var cp = ((h - 0xD800) << 10) + (l + 0x2400);
            buf[j++] = 0xF0 | (cp >> 0x12);
            buf[j++] = 0x80 | (cp >> 0x0C) & 0x3F;
            buf[j++] = 0x80 | (cp >> 0x06) & 0x3F;
            buf[j++] = 0x80 | cp & 0x3F;
          } else {
            buf[j++] = 0xEF;
            buf[j++] = 0xBF;
            buf[j++] = 0xBD;
            continue;
          }
        } else {
          buf[j++] = 0xEF;
          buf[j++] = 0xBF;
          buf[j++] = 0xBD;
          continue;
        }
      } else {
        if (h < 0x80) {
          buf[j++] = h;
        } else if (h < 0x800) {
          buf[j++] = 0xC0 | h >> 6;
          buf[j++] = 0x80 | h & 0x3F;
          len += 2;
        } else if (h < 0x10000) {
          buf[j++] = 0xE0 | (h >> 0xC);
          buf[j++] = 0x80 | (h >> 0x6) & 0x3F;
          buf[j++] = 0x80 | (h >> 0x0) & 0x3F;
          len += 3;
        }
      }
    }

    return Promise.resolve(buf.buffer);
  };

  // This decoder is based on "Flexible and Economical UTF-8 Decoder"
  // Copyright (c) 2008-2010 Bjoern Hoehrmann <bjoern@hoehrmann.de>
  // See http://bjoern.hoehrmann.de/utf-8/decoder/dfa/ for details
  var utf8d = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
    7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
    8, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    0xa, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x4, 0x3, 0x3,
    0xb, 0x6, 0x6, 0x6, 0x5, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8, 0x8,
    0x0, 0x1, 0x2, 0x3, 0x5, 0x8, 0x7, 0x1, 0x1, 0x1, 0x4, 0x6, 0x1, 0x1, 0x1, 0x1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1,
    1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 3, 1, 1, 1, 1, 1, 1,
    1, 3, 1, 1, 1, 1, 1, 3, 1, 3, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  ];

  JSCodec.prototype.decode = function (buf) {
    var codepoint = 0;
    var state = 0;
    var str = '';

    function decode1 (byte) {
      var type = utf8d[byte];
      codepoint = (state !== 0) ? (byte & 0x3f) | (codepoint << 6) : (0xff >> type) & (byte);
      state = utf8d[256 + state * 16 + type];
      return state;
    }

    for (var i = 0; i < buf.length; ++i) {
      // Force V8 to flatten the string.
      if (i % 1000000 === 0) {
        str[0];
      }

      switch (decode1(buf[i])) {
        case 0:
          break;
        case 1:
          str += String.fromCharCode(0xFFFD);
          while (i + 1 < buf.length && (buf[i + 1] & 0xC0) === 0x80) ++i;
          state = codepoint = 0;
          continue;
        default:
          continue;
      }

      if (codepoint <= 0xFFFF) {
        str += String.fromCharCode(codepoint);
      } else {
        str += String.fromCharCode(
          0xD7C0 + (codepoint >> 10),
          0xDC00 + (codepoint & 0x3FF)
        );
      }

      codepoint = 0;
    }

    return Promise.resolve(str);
  };

  utf8['JSCodec'] = JSCodec;

  var defaultCodec = null;

  // TODO: detect polyfill
  // We can handle data much more efficiently than the polyfill.
  if (root.TextDecoder && root.TextEncoder) {
    defaultCodec = new NativeCodec();
  } else if (root.Blob && root.FileReader) {
    defaultCodec = new BlobCodec();
  } else if (root.Buffer && root.Buffer.from) {
    defaultCodec = new NodeJSCodec();
  } else {
    defaultCodec = new JSCodec();
  }

  // API
  utf8['encode'] = function (str) { return defaultCodec.encode(str); };
  utf8['decode'] = function (buf) { return defaultCodec.decode(buf); };

  if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = utf8;
  } else {
    // Global
    root.utf8 = utf8;
  }
})();
