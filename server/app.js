import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { APPOINTMENT_FIELDS, WorkbookStore } from './workbook-store.js';

const DEFAULT_WORKBOOK = path.resolve(process.cwd(), 'data', 'suresh-appointment-data.xlsx');
const DEVELOPMENT_SECRET = 'development-only-change-me';
let warnedAboutDevelopmentSecret = false;

function getJwtSecret(explicitSecret) {
  const secret = explicitSecret || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (!warnedAboutDevelopmentSecret) {
    console.warn('WARNING: JWT_SECRET is not set; using an insecure development-only secret.');
    warnedAboutDevelopmentSecret = true;
  }
  return DEVELOPMENT_SECRET;
}

function apiError(status, message, code = 'BAD_REQUEST', details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function validateAuth(body, signup = false) {
  const errors = [];
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mobile = typeof body.mobile === 'string' ? body.mobile.trim() : '';
  if (signup && (name.length < 2 || name.length > 100)) errors.push('name must be between 2 and 100 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.push('email must be valid');
  if (password.length < 8 || password.length > 128) errors.push('password must be between 8 and 128 characters');
  if (signup && mobile.length > 40) errors.push('mobile must be at most 40 characters');
  if (errors.length) throw apiError(422, 'Validation failed', 'VALIDATION_ERROR', errors);
  return { name, email, mobile, password };
}

function cleanString(value, field, maxLength, errors) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) errors.push(`${field} must be at most ${maxLength} characters`);
  return cleaned;
}

function displayDate(value) {
  const [year, month, day] = String(value || '').split('-');
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1];
  return year && monthName && day ? `${day}/${monthName}/${year}` : value;
}

function validateAppointment(body, partial = false) {
  const result = {};
  const errors = [];
  const limits = {
    title: 200, meetingWith: 150, company: 150, email: 254, mobile: 40,
    location: 300, meetingUrl: 2000, type: 50, priority: 50, status: 50,
    description: 5000, agenda: 5000, notes: 10000,
  };
  for (const [field, limit] of Object.entries(limits)) {
    const value = cleanString(body[field], field, limit, errors);
    if (value !== undefined) result[field] = value;
  }

  for (const field of ['date', 'startTime', 'endTime']) {
    if (body[field] !== undefined) result[field] = cleanString(body[field], field, 20, errors);
  }
  if (!partial || body.title !== undefined) {
    if (!result.title) errors.push('title is required');
  }
  if (!partial || body.date !== undefined) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(result.date || '') ? new Date(`${result.date}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== result.date) {
      errors.push('date must be a valid YYYY-MM-DD date');
    }
  }
  for (const field of ['startTime', 'endTime']) {
    if (!partial || body[field] !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result[field] || '')) errors.push(`${field} must use HH:mm format`);
    }
  }
  if (result.startTime && result.endTime && result.endTime <= result.startTime) {
    errors.push('endTime must be later than startTime');
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) errors.push('email must be valid');
  if (result.meetingUrl) {
    try {
      const url = new URL(result.meetingUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.push('meetingUrl must be a valid HTTP(S) URL');
    }
  }
  for (const field of ['recurring', 'reminder']) {
    if (body[field] !== undefined) {
      if (typeof body[field] === 'function' || typeof body[field] === 'symbol') errors.push(`${field} is invalid`);
      else result[field] = body[field];
    }
  }
  const unknown = Object.keys(body).filter((key) => !APPOINTMENT_FIELDS.includes(key));
  if (unknown.length) errors.push(`unknown fields: ${unknown.join(', ')}`);
  if (errors.length) throw apiError(422, 'Validation failed', 'VALIDATION_ERROR', errors);
  return result;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, mobile: user.mobile || '', createdAt: user.createdAt };
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function createApp(options = {}) {
  const app = express();
  const store = options.store || new WorkbookStore(options.workbookPath || process.env.APPOINTMENT_WORKBOOK_PATH || DEFAULT_WORKBOOK);
  const jwtSecret = getJwtSecret(options.jwtSecret);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));

  const authenticate = (request, response, next) => {
    const match = request.get('authorization')?.match(/^Bearer\s+(.+)$/i);
    if (!match) return next(apiError(401, 'Authentication required', 'AUTH_REQUIRED'));
    try {
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
      if (typeof payload !== 'object' || !payload.sub) throw new Error('Invalid token payload');
      request.user = { id: payload.sub, email: payload.email };
      return next();
    } catch {
      return next(apiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
    }
  };

  app.get('/api/health', asyncRoute(async (_request, response) => {
    await store.initialize();
    response.json({ status: 'ok' });
  }));

  app.post('/api/auth/signup', asyncRoute(async (request, response) => {
    const input = validateAuth(request.body, true);
    const now = new Date().toISOString();
    const user = await store.createUser({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      passwordHash: await bcrypt.hash(input.password, 12),
      createdAt: now,
    });
    const token = jwt.sign({ email: user.email }, jwtSecret, { subject: user.id, expiresIn: '7d', algorithm: 'HS256' });
    response.status(201).json({ token, user: publicUser(user) });
  }));

  app.post('/api/auth/login', asyncRoute(async (request, response) => {
    const input = validateAuth(request.body);
    const user = await store.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, String(user.passwordHash)))) {
      throw apiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    const token = jwt.sign({ email: user.email }, jwtSecret, { subject: user.id, expiresIn: '7d', algorithm: 'HS256' });
    response.json({ token, user: publicUser(user) });
  }));

  app.use('/api/appointments', authenticate);
  app.get('/api/appointments', asyncRoute(async (request, response) => {
    let appointments = await store.listAppointments(request.user.id);
    const { from, to, status } = request.query;
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw apiError(422, 'from must use YYYY-MM-DD format', 'VALIDATION_ERROR');
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw apiError(422, 'to must use YYYY-MM-DD format', 'VALIDATION_ERROR');
    if (from) appointments = appointments.filter((item) => item.date >= from);
    if (to) appointments = appointments.filter((item) => item.date <= to);
    if (status) appointments = appointments.filter((item) => item.status === status);
    response.json(appointments);
  }));

  app.get('/api/appointments/reminders', asyncRoute(async (request, response) => {
    const now = new Date();
    const until = request.query.until ? new Date(request.query.until) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(until.getTime())) throw apiError(422, 'until must be a valid date-time', 'VALIDATION_ERROR');
    const appointments = (await store.listAppointments(request.user.id)).filter((item) => {
      if (item.reminder === undefined || item.reminder === '' || item.reminder === false) return false;
      const startsAt = new Date(`${item.date}T${item.startTime}:00`);
      return !Number.isNaN(startsAt.getTime()) && startsAt >= now && startsAt <= until;
    });
    response.json(appointments);
  }));

  app.post('/api/appointments', asyncRoute(async (request, response) => {
    const input = validateAppointment(request.body);
    const now = new Date().toISOString();
    const appointment = await store.createAppointment({
      id: randomUUID(), userId: request.user.id, ...input, createdAt: now, updatedAt: now,
    });
    response.status(201).json(appointment);
  }));

  app.get('/api/appointments/:id', asyncRoute(async (request, response) => {
    const appointment = await store.getAppointment(request.user.id, request.params.id);
    if (!appointment) throw apiError(404, 'Appointment not found', 'NOT_FOUND');
    response.json(appointment);
  }));

  app.put('/api/appointments/:id', asyncRoute(async (request, response) => {
    const current = await store.getAppointment(request.user.id, request.params.id);
    if (!current) throw apiError(404, 'Appointment not found', 'NOT_FOUND');
    const changes = validateAppointment(request.body, true);
    const merged = { ...current, ...changes };
    validateAppointment(Object.fromEntries(APPOINTMENT_FIELDS.filter((field) => !['createdAt', 'updatedAt'].includes(field)).map((field) => [field, merged[field]]).filter(([, value]) => value !== undefined)));
    const appointment = await store.updateAppointment(request.user.id, request.params.id, { ...changes, updatedAt: new Date().toISOString() });
    response.json(appointment);
  }));

  app.delete('/api/appointments/:id', asyncRoute(async (request, response) => {
    if (!(await store.deleteAppointment(request.user.id, request.params.id))) {
      throw apiError(404, 'Appointment not found', 'NOT_FOUND');
    }
    response.status(204).end();
  }));

  app.use('/api/settings', authenticate);
  app.get('/api/settings', asyncRoute(async (request, response) => {
    response.json(await store.getSettings(request.user.id));
  }));
  app.put('/api/settings', asyncRoute(async (request, response) => {
    if (!request.body || Array.isArray(request.body) || typeof request.body !== 'object') {
      throw apiError(422, 'Settings must be a JSON object', 'VALIDATION_ERROR');
    }
    const serialized = JSON.stringify(request.body);
    if (serialized.length > 50_000) throw apiError(413, 'Settings are too large', 'PAYLOAD_TOO_LARGE');
    response.json(await store.putSettings(request.user.id, request.body, new Date().toISOString()));
  }));

  app.get('/api/reports/excel', authenticate, asyncRoute(async (request, response) => {
    let appointments = await store.listAppointments(request.user.id);
    const { from, to, type } = request.query;
    if (from) appointments = appointments.filter((item) => item.date >= from);
    if (to) appointments = appointments.filter((item) => item.date <= to);
    if (type && type !== 'all') appointments = appointments.filter((item) => item.type === type);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Suresh Appointment App';
    const sheet = workbook.addWorksheet('Appointment Report', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = [
      ['Date', 'date', 14], ['Time', 'time', 18], ['Appointment', 'title', 28],
      ['Meeting With', 'meetingWith', 22], ['Type', 'type', 18], ['Location', 'location', 24],
      ['Priority', 'priority', 12], ['Status', 'status', 14], ['Notes', 'notes', 36],
    ].map(([header, key, width]) => ({ header, key, width }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    for (const item of appointments) {
      sheet.addRow({ ...item, date: displayDate(item.date), time: `${item.startTime || ''}${item.endTime ? ` - ${item.endTime}` : ''}` });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    response
      .set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', 'attachment; filename="suresh-appointment-report.xlsx"')
      .send(Buffer.from(buffer));
  }));

  app.use('/api', (_request, _response, next) => next(apiError(404, 'API route not found', 'NOT_FOUND')));

  const distPath = path.resolve(options.distPath || path.join(process.cwd(), 'dist'));
  if ((options.serveStatic ?? process.env.NODE_ENV === 'production') && existsSync(distPath)) {
    app.use(express.static(distPath, { index: false, maxAge: '1d' }));
    app.use((request, response, next) => {
      if (request.method === 'GET' && request.accepts('html')) return response.sendFile(path.join(distPath, 'index.html'));
      return next();
    });
  }

  app.use((error, _request, response, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error(error);
    response.status(status).json({
      error: {
        code: error.code || (status < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR'),
        message: status >= 500 ? 'Internal server error' : error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  });

  app.locals.store = store;
  return app;
}
