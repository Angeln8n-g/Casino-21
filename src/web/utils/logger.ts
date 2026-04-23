/**
 * logger.ts — Logger centralizado por entorno
 *
 * En producción (import.meta.env.PROD) todas las funciones son no-ops:
 * no se emite ningún mensaje a la consola del navegador.
 *
 * En desarrollo (import.meta.env.DEV) se comporta como console.* normal.
 *
 * Vite también elimina automáticamente todos los console.* en el build
 * de producción gracias a la config esbuild.drop en vite.config.mts.
 * Este logger actúa como segunda línea de defensa para builds de staging
 * o cualquier entorno que no pase por el bundler de Vite.
 */

const isDev = import.meta.env.DEV;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export const logger = {
  /** Solo en desarrollo. Para trazas de flujo normales. */
  log: isDev ? console.log.bind(console) : noop,

  /** Solo en desarrollo. Para mensajes de diagnóstico detallado. */
  debug: isDev ? console.debug.bind(console) : noop,

  /** Solo en desarrollo. Para advertencias no críticas. */
  warn: isDev ? console.warn.bind(console) : noop,

  /** Solo en desarrollo. Para errores y excepciones. */
  error: isDev ? console.error.bind(console) : noop,
};
