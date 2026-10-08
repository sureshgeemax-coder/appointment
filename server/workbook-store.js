import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';

export const APPOINTMENT_FIELDS = [
  'title',
  'date',
  'startTime',
  'endTime',
  'meetingWith',
  'company',
  'email',
  'mobile',
  'location',
  'meetingUrl',
  'type',
  'priority',
  'status',
  'description',
  'agenda',
  'notes',
  'recurring',
  'reminder',
  'createdAt',
  'updatedAt',
];

const SHEETS = {
  Users: ['id', 'name', 'email', 'mobile', 'passwordHash', 'createdAt'],
  Appointments: ['id', 'userId', ...APPOINTMENT_FIELDS],
  Settings: ['userId', 'settingsJson', 'updatedAt'],
};

function valueFromCell(cell) {
  const value = cell.value;
  if (value && typeof value === 'object' && 'text' in value) return value.text;
  return value instanceof Date ? value.toISOString() : value;
}

function rowToObject(sheet, row) {
  return Object.fromEntries(
    SHEETS[sheet.name].map((header, index) => [header, valueFromCell(row.getCell(index + 1))]),
  );
}

function serializeSpecialFields(appointment) {
  const result = { ...appointment };
  const dateMatch = String(result.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    result.date = `${dateMatch[3]}/${months[Number(dateMatch[2]) - 1]}/${dateMatch[1]}`;
  }
  for (const field of ['recurring', 'reminder']) {
    if (result[field] !== undefined) result[field] = JSON.stringify(result[field]);
  }
  return result;
}

function deserializeSpecialFields(appointment) {
  const result = { ...appointment };
  const dateMatch = String(result.date || '').match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dateMatch) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(dateMatch[2].toLowerCase()) + 1;
    if (month) result.date = `${dateMatch[3]}-${String(month).padStart(2, '0')}-${dateMatch[1]}`;
  }
  for (const field of ['recurring', 'reminder']) {
    if (typeof result[field] !== 'string' || !result[field]) continue;
    try {
      result[field] = JSON.parse(result[field]);
    } catch {
      // Keep legacy or manually edited workbook values readable.
    }
  }
  return result;
}

export class WorkbookStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.queue = Promise.resolve();
    this.initialized = false;
  }

  runSerial(operation) {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async initialize() {
    return this.runSerial(() => this.ensureInitialized());
  }

  async ensureInitialized() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const backupPath = `${this.filePath}.bak`;
    if (!existsSync(this.filePath) && existsSync(backupPath)) {
      await rename(backupPath, this.filePath);
    }

    const workbook = new ExcelJS.Workbook();
    if (existsSync(this.filePath)) {
      await workbook.xlsx.readFile(this.filePath);
    }

    let changed = false;
    for (const [name, headers] of Object.entries(SHEETS)) {
      let sheet = workbook.getWorksheet(name);
      if (!sheet) {
        sheet = workbook.addWorksheet(name);
        changed = true;
      }
      if (sheet.rowCount === 0) {
        sheet.addRow(headers);
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        changed = true;
      } else {
        const actual = headers.map((_, index) => String(valueFromCell(sheet.getRow(1).getCell(index + 1)) ?? ''));
        if (actual.join('|') !== headers.join('|')) {
          throw new Error(`Workbook sheet ${name} has an incompatible header row`);
        }
      }
    }

    if (changed) await this.atomicWrite(workbook);
    this.initialized = true;
  }

  async load() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    return workbook;
  }

  async atomicWrite(workbook) {
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const backupPath = `${this.filePath}.bak`;
    await workbook.xlsx.writeFile(temporaryPath);

    let movedOriginal = false;
    try {
      await unlink(backupPath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
      await rename(this.filePath, backupPath);
      movedOriginal = true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        await unlink(temporaryPath).catch(() => undefined);
        throw error;
      }
    }

    try {
      await rename(temporaryPath, this.filePath);
      if (movedOriginal) await unlink(backupPath).catch(() => undefined);
    } catch (error) {
      if (movedOriginal) await rename(backupPath, this.filePath).catch(() => undefined);
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  async read(operation) {
    return this.runSerial(async () => {
      await this.ensureInitialized();
      return operation(await this.load());
    });
  }

  async write(operation) {
    return this.runSerial(async () => {
      await this.ensureInitialized();
      const workbook = await this.load();
      const result = await operation(workbook);
      await this.atomicWrite(workbook);
      return result;
    });
  }

  findUserByEmail(email) {
    return this.read((workbook) => {
      const sheet = workbook.getWorksheet('Users');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const user = rowToObject(sheet, sheet.getRow(number));
        if (String(user.email).toLowerCase() === email.toLowerCase()) return user;
      }
      return null;
    });
  }

  createUser(user) {
    return this.write((workbook) => {
      const sheet = workbook.getWorksheet('Users');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const existing = rowToObject(sheet, sheet.getRow(number));
        if (String(existing.email).toLowerCase() === user.email.toLowerCase()) {
          const error = new Error('An account with this email already exists');
          error.status = 409;
          error.code = 'EMAIL_EXISTS';
          throw error;
        }
      }
      sheet.addRow(SHEETS.Users.map((header) => user[header] ?? ''));
      return user;
    });
  }

  listAppointments(userId) {
    return this.read((workbook) => {
      const sheet = workbook.getWorksheet('Appointments');
      const appointments = [];
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const appointment = rowToObject(sheet, sheet.getRow(number));
        if (appointment.userId === userId) appointments.push(deserializeSpecialFields(appointment));
      }
      return appointments.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
    });
  }

  getAppointment(userId, id) {
    return this.read((workbook) => {
      const sheet = workbook.getWorksheet('Appointments');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const appointment = rowToObject(sheet, sheet.getRow(number));
        if (appointment.id === id && appointment.userId === userId) {
          return deserializeSpecialFields(appointment);
        }
      }
      return null;
    });
  }

  createAppointment(appointment) {
    return this.write((workbook) => {
      const stored = serializeSpecialFields(appointment);
      workbook.getWorksheet('Appointments').addRow(
        SHEETS.Appointments.map((header) => stored[header] ?? ''),
      );
      return appointment;
    });
  }

  updateAppointment(userId, id, changes) {
    return this.write((workbook) => {
      const sheet = workbook.getWorksheet('Appointments');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const current = rowToObject(sheet, sheet.getRow(number));
        if (current.id !== id || current.userId !== userId) continue;
        const updated = { ...deserializeSpecialFields(current), ...changes, id, userId };
        const stored = serializeSpecialFields(updated);
        SHEETS.Appointments.forEach((header, index) => {
          sheet.getRow(number).getCell(index + 1).value = stored[header] ?? '';
        });
        return updated;
      }
      return null;
    });
  }

  deleteAppointment(userId, id) {
    return this.write((workbook) => {
      const sheet = workbook.getWorksheet('Appointments');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const current = rowToObject(sheet, sheet.getRow(number));
        if (current.id === id && current.userId === userId) {
          // ExcelJS can retain the final row when spliceRows removes it.
          sheet.getRow(number).values = [];
          return true;
        }
      }
      return false;
    });
  }

  getSettings(userId) {
    return this.read((workbook) => {
      const sheet = workbook.getWorksheet('Settings');
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        const value = rowToObject(sheet, sheet.getRow(number));
        if (value.userId === userId) {
          try {
            return JSON.parse(value.settingsJson || '{}');
          } catch {
            return {};
          }
        }
      }
      return {};
    });
  }

  putSettings(userId, settings, updatedAt) {
    return this.write((workbook) => {
      const sheet = workbook.getWorksheet('Settings');
      const values = [userId, JSON.stringify(settings), updatedAt];
      for (let number = 2; number <= sheet.rowCount; number += 1) {
        if (rowToObject(sheet, sheet.getRow(number)).userId === userId) {
          sheet.getRow(number).values = values;
          return settings;
        }
      }
      sheet.addRow(values);
      return settings;
    });
  }
}
