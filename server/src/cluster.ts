import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const numWorkers = process.env.WORKERS
    ? parseInt(process.env.WORKERS, 10)
    : Math.min(os.cpus().length, 6);

  console.log(`[Master ${process.pid}] Starting Casino21 Cluster with ${numWorkers} worker processes...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Master] Worker ${worker.process.pid} died (signal: ${signal}, code: ${code}). Respawning replacement...`);
    cluster.fork();
  });
} else {
  require('./index');
}
