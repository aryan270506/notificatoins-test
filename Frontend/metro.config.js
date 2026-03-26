const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('react-native-get-random-values'),
};

module.exports = config;