// Ejecutar desde backend: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'nes-eventos',
    cwd: __dirname,
    script: './src/index.js',
    node_args: '--env-file-if-exists=.env',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    env: { NODE_ENV: 'production' },
  }],
};
