// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/DEPENDENCIES_REQUIRED.md
# 📦 Required Dependencies for Rate Limiting

## Already Installed (Check package.json)

The following should already be in your `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.0+",
    "socket.io": "^4.0.0+",
    "axios": "^0.27.0+",
    "mongoose": "^6.0.0+",
    "cors": "^2.8.5+",
    "dotenv": "^16.0.0+"
  }
}
```

## New Dependencies to Install (Optional but Recommended)

```bash
# For production monitoring & clustering
npm install pm2 --save-dev
npm install compression --save

# For advanced rate limiting (if you want more features)
npm install p-limit --save

# For better logging
npm install winston --save

# For testing
npm install jest --save-dev
npm install supertest --save-dev
```

## Complete package.json Scripts (Update Yours)

```json
{
  "scripts": {
    "start": "node Server.js",
    "dev": "nodemon Server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "prod": "pm2 start ecosystem.config.js",
    "prod:stop": "pm2 delete ecosystem.config.js",
    "prod:restart": "pm2 restart ecosystem.config.js",
    "prod:logs": "pm2 logs Backend",
    "prod:monit": "pm2 monit",
    "prod:save": "pm2 save",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

## Installation Instructions

### Step 1: Install Node.js Dependencies

```bash
npm install
```

### Step 2: Install PM2 Globally (For Production)

```bash
npm install -g pm2

# Verify installation
pm2 -v
```

### Step 3: Verify Core Dependencies

```bash
npm list express socket.io mongoose axios
```

Should show versions without errors.

### Step 4: Test Backend Starts

```bash
npm start
```

You should see:
```
╔════════════════════════════════════╗
║  🚀 Backend Server Running        ║
║  Port: 5000                       ║
║  Rate Limit: 100 req/sec per user ║
╚════════════════════════════════════╝
```

---

## Dependency Versions (Recommended)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.5.4",
    "socket.io-client": "^4.5.4",
    "axios": "^1.3.0",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "compression": "^1.7.4",
    "p-limit": "^5.0.0"
  },
  "devDependencies": {
    "pm2": "^5.3.0",
    "nodemon": "^2.0.20",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

---

## Version Compatibility

| Package | Min Version | Tested With |
|---------|------------|-------------|
| Node.js | 14.x | 18.x |
| Express | 4.17.x | 4.18.x |
| Socket.io | 4.0.0 | 4.5.x |
| MongoDB | 4.0 | 5.0+ |
| Mongoose | 6.0.0 | 7.0.x |

---

## Troubleshooting Installation

### npm install fails
```bash
# Clear cache and try again
npm cache clean --force
rm package-lock.json
npm install
```

### Module not found errors
```bash
# Reinstall specific package
npm install --save express

# Or reinstall all
rm -rf node_modules package-lock.json
npm install
```

### PM2 installation issues
```bash
# Use sudo if needed
sudo npm install -g pm2

# Or use npx (no global install)
npx pm2 start ecosystem.config.js
```

### Socket.io version conflicts
```bash
# Use exact version
npm install socket.io@4.5.4 --save
```

---

## Post-Installation Verification

Run this to verify everything is installed:

```bash
#!/bin/bash

echo "Checking Node.js..."
node -v

echo "Checking npm..."
npm -v

echo "Checking PM2..."
pm2 -v

echo "Checking installed packages..."
npm list --depth=0

echo "Testing require() of core modules..."
node -e "
  try {
    require('express');
    console.log('✅ express');
    require('socket.io');
    console.log('✅ socket.io');
    require('mongoose');
    console.log('✅ mongoose');
    require('axios');
    console.log('✅ axios');
    console.log('✅ All dependencies OK!');
  } catch(e) {
    console.log('❌ Missing:', e.message);
    process.exit(1);
  }
"
```

---

## Optional Performance Packages

### For Caching (Future Enhancement)
```bash
npm install redis ioredis
```

### For Monitoring (Future Enhancement)
```bash
npm install winston winston-daily-rotate-file
npm install sentry-node
npm install datadog-browser-rum
```

### For Database Optimization (Future Enhancement)
```bash
npm install redis-cache
npm install bulk-operations
```

---

## Security Packages (Recommended)

```bash
npm install helmet                    # Security headers
npm install express-validator         # Input validation  
npm install bcryptjs                  # Password hashing
npm install jsonwebtoken              # JWT tokens
npm install express-rate-limit        # Additional rate limiting (optional)
```

---

## Complete Installation Command

```bash
# Install all at once
npm install express@^4.18.2 \
  socket.io@^4.5.4 \
  mongoose@^7.0.0 \
  axios@^1.3.0 \
  cors@^2.8.5 \
  dotenv@^16.0.3 \
  compression@^1.7.4 \
  p-limit@^5.0.0 \
  helmet@^7.0.0 \
  jsonwebtoken@^9.0.0 \
  bcryptjs@^2.4.3 \
  express-validator@^7.0.0

# Dev dependencies
npm install --save-dev \
  pm2@^5.3.0 \
  nodemon@^2.0.20 \
  jest@^29.5.0 \
  supertest@^6.3.3
```

---

## Docker Dependencies

If using Docker, these are automatically installed:

```dockerfile
FROM node:18-alpine

# Node.js dependencies already included
# Just run npm install in container
```

---

## Summary

✅ **Core dependencies:** Already installed  
✅ **Rate limiting:** No new npm packages required  
✅ **Production (PM2):** `npm install -g pm2`  
✅ **Optional enhancements:** See above sections  

**Total setup time:** 2-3 minutes

---

## Quick Install Summary

```bash
# 1. Install PM2 globally (one time)
npm install -g pm2

# 2. No new npm packages needed!
# Your existing package.json has everything

# 3. Start backend (dev)
npm start

# 4. Start backend (prod)
pm2 start ecosystem.config.js
```

That's it! Rate limiting is ready to go! 🚀
