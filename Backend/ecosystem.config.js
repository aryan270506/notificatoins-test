// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/ecosystem.config.js
/**
 * PM2 Ecosystem Configuration
 * Handles cluster mode, auto-restart, memory management, and graceful shutdown
 * 
 * Usage:
 *   pm2 start ecosystem.config.js                    # Start
 *   pm2 restart ecosystem.config.js                  # Restart
 *   pm2 delete ecosystem.config.js                   # Stop & delete
 *   pm2 logs Backend                                 # View logs
 */

module.exports = {
  apps: [
    {
      name: 'Backend',
      script: './Server.js',
      
      // Cluster mode uses all CPU cores for better performance
      instances: 'max',           // 'max' = number of CPU cores
      exec_mode: 'cluster',       // 'cluster' for multi-process, 'fork' for single
      
      // Memory management
      max_memory_restart: '1G',   // Auto-restart if exceeds 1GB
      
      // Graceful shutdown
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart policies
      auto_restart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Disable Node.js default restart
      autorestart: true,
      watch: false,  // Set to true to auto-reload on file changes (dev only)
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Handle signals
      shutdown_with_message: true,
      
      // Performance monitoring
      instance_var: 'INSTANCE_ID',
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      key: '~/.ssh/id_rsa',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/backend.git',
      path: '/var/www/backend',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
  },
};
