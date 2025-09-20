module.exports = {
  apps: [{
    name: 'minecraft-server-manager',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'development',
      PORT: 12800
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 12800
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};