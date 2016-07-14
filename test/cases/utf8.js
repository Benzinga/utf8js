/* eslint-env node, mocha */
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var utf8 = require('../../utf8');

chai.use(chaiAsPromised);
var expect = chai.expect;

// Find root object (depends on JS environment)
var root;
if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
}

// Use plain old arrays for older browsers and older Node.
function byteArray (arg) {
  if (root.Uint8Array) {
    return new Uint8Array(arg);
  } else {
    if (typeof arg === 'number' || typeof arg === 'undefined') {
      return new Array(arg);
    } else {
      return arg;
    }
  }
}

// Test cases
var validStrs = [
  { b: 'test', u: [116, 101, 115, 116] },
  { b: '日本語', u: [230, 151, 165, 230, 156, 172, 232, 170, 158] }
];

describe('utf8', function () {
  describe('#encode', function () {
    it('should encode valid strings correctly', function () {
      for (var i = 0; i < validStrs.length; i++) {
        expect(utf8.encode(validStrs[i].b)).to.eventually.deep.equal(validStrs[i].u);
      }
    });
  });

  describe('#decode', function () {
    it('should decode valid strings correctly', function () {
      for (var i = 0; i < validStrs.length; i++) {
        expect(utf8.decode(validStrs[i].u)).to.eventually.deep.equal(validStrs[i].b);
      }
    });
  });
});
