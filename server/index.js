import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';

export { createApp } from './app.js';
export { WorkbookStore } from './workbook-store.js';

export async function startServer(options = {}) {
  const app = options.app || createApp(options);
  await app.locals.store.initialize();
  const port = options.port ?? Number(process.env.PORT || 3001);
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.once('error', reject);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer()
    .then((server) => console.log(`Appointment API listening on port ${server.address().port}`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
