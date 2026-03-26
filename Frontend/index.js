// Must use require() not import — forces sync execution before anything loads
require('./polyfills');
require('react-native-get-random-values');
require('react-native-url-polyfill/auto');

const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);