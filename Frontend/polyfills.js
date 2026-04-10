import { Buffer } from 'buffer';

// Ensure global is defined
if (typeof global === 'undefined') {
  window.global = window;
}

// Set up Buffer
global.Buffer = Buffer;

// Polyfill TextDecoder for latin1 support
if (typeof global.TextDecoder !== 'undefined') {
  const OriginalTextDecoder = global.TextDecoder;
  
  global.TextDecoder = class TextDecoderPolyfill extends OriginalTextDecoder {
    constructor(label = 'utf-8', options = {}) {
      let normalizedLabel = String(label || 'utf-8').toLowerCase();
      
      // Replace unsupported encodings
      if (normalizedLabel === 'latin1' || normalizedLabel === 'iso-8859-1') {
        normalizedLabel = 'utf-8';
      }
      
      try {
        super(normalizedLabel, options);
      } catch (e) {
        // Fallback to utf-8 if encoding is not supported
        super('utf-8', options);
      }
    }
  };
}