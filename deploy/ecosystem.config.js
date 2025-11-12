module.exports = {
  apps: [{
    name: 'campus-api',
    script: './miniapp/api-server/dist/server.js',
    cwd: '/var/www/maxhackathon.ru',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      DB_PATH: '/var/www/maxhackathon.ru/data/campus.db'
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};

