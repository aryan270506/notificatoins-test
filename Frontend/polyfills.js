const { Buffer } = require('buffer');
global.Buffer = global.Buffer || Buffer;

const { TextEncoder, TextDecoder } = require('text-encoding');
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const { decode, encode } = require('base-64');
global.atob = global.atob || decode;
global.btoa = global.btoa || encode;