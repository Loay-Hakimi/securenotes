// Production entrypoint: open the real database and start listening.
import { createApp } from './app.js';
import { openDb } from './db.js';
import { config } from './config.js';

const db = openDb(config.dbPath);
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`[SecureNotes] API listening on :${config.port} (${config.isProd ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`[SecureNotes] ${signal} received, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
