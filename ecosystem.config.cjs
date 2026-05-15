module.exports = {
  apps: [
    {
      name: 'casino21-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ALLOW_INSECURE_JWT_FALLBACK: 'false',
        REDIS_URL: 'redis://127.0.0.1:6379',
      },
      node_args: '--max-old-space-size=1536',
    },
  ],
};
