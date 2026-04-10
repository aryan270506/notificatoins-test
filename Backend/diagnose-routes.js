// Quick diagnostic - check which route file is exporting wrong format

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'Routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('Routes.js'));

console.log('🔍 Checking all route files...\n');

files.forEach(file => {
  try {
    const route = require(path.join(routesDir, file));
    
    if (typeof route === 'function') {
      console.log(`✅ ${file} - Correctly exports Express router`);
    } else if (typeof route === 'object') {
      console.log(`❌ ${file} - WRONG! Exports an object instead of router`);
      console.log('   Should end with: module.exports = router;');
    } else {
      console.log(`⚠️  ${file} - Exports: ${typeof route}`);
    }
  } catch (error) {
    console.log(`❌ ${file} - ERROR: ${error.message}`);
  }
});
