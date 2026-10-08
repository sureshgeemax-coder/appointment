import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';

export { createApp } from './app.js';
export { WorkbookStore } from './workbook-store.js';

export async function startServer(options = {}) {
  const app = options.app || createApp(options);
  await app.locals.store.initialize();
  const port = options.port ?? Number(process.env.PORT || 3001);
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer()
    .then((server) => {
      const address = server.address();
      console.log(`Appointment API listening on port ${typeof address === 'object' && address ? address.port : process.env.PORT || 3001}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
