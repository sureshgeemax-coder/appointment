import { createApp } from '../server/app.js';
import { BlobWorkbookStore } from '../server/blob-workbook-store.js';

const store = new BlobWorkbookStore();
const app = createApp({ store, serveStatic: false });

export default app;
