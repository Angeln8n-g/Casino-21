module.exports = {
  apps: [
    {
      name: 'casino21-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ALLOW_INSECURE_JWT_FALLBACK: 'false',
      },
    },
  ],
};
