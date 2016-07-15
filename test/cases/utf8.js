/* eslint-env node, mocha */
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var utf8 = require('../../utf8');

chai.use(chaiAsPromised);
var expect = chai.expect;

// Test cases
var validStrs = [
  { b: 'test', u: [116, 101, 115, 116] },
  { b: '日本語', u: [230, 151, 165, 230, 156, 172, 232, 170, 158] }
];

describe('utf8', function () {
  describe('#encode', function () {
    it('should encode valid strings correctly', function () {
      for (var i = 0; i < validStrs.length; i++) {
        expect(utf8.encode(validStrs[i].b)).to.eventually.deep.equal(new Uint8Array(validStrs[i].u).buffer);
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
