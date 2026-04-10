const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js modules
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util'),
  string_decoder: require.resolve('string_decoder'),
  encoding: require.resolve('encoding'),
};

// Configure source extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;