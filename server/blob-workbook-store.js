import { readFile, writeFile } from 'node:fs/promises';
import { get, put } from '@vercel/blob';
import { WorkbookStore } from './workbook-store.js';

const BLOB_PATH = 'data/suresh-appointment-data.xlsx';

export class BlobWorkbookStore extends WorkbookStore {
  constructor(filePath = '/tmp/suresh-appointment-data.xlsx') {
    super(filePath);
    this.blobPath = BLOB_PATH;
  }

  async downloadWorkbook() {
    const result = await get(this.blobPath, { access: 'private', useCache: false });
    if (!result?.stream) return false;
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    await writeFile(this.filePath, buffer);
    return true;
  }

  async uploadWorkbook() {
    await put(this.blobPath, await readFile(this.filePath), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  async prepareWorkbook() {
    const downloaded = await this.downloadWorkbook();
    this.initialized = false;
    await super.ensureInitialized();
    if (!downloaded) await this.uploadWorkbook();
  }

  async initialize() {
    return this.runSerial(() => this.prepareWorkbook());
  }

  async read(operation) {
    return this.runSerial(async () => {
      await this.prepareWorkbook();
      return operation(await this.load());
    });
  }

  async write(operation) {
    return this.runSerial(async () => {
      await this.prepareWorkbook();
      const workbook = await this.load();
      const result = await operation(workbook);
      await this.atomicWrite(workbook);
      await this.uploadWorkbook();
      return result;
    });
  }
}
