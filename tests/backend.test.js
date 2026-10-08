import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';

describe('appointment backend', () => {
  let directory;
  let workbookPath;
  let app;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'appointment-api-'));
    workbookPath = path.join(directory, 'appointments.xlsx');
    app = createApp({ workbookPath, jwtSecret: 'test-secret-with-enough-entropy', serveStatic: false });
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  async function signup(email = 'suresh@example.com', name = 'Suresh') {
    return request(app).post('/api/auth/signup').send({ name, email, mobile: '+91 90000 00000', password: 'correct-horse-123' });
  }

  it('initializes the workbook and stores only a bcrypt password hash', async () => {
    const response = await signup();
    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('passwordHash');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Users', 'Appointments', 'Settings']);
    const users = workbook.getWorksheet('Users');
    expect(users.getRow(1).values.slice(1)).toEqual(['id', 'name', 'email', 'mobile', 'passwordHash', 'createdAt']);
    expect(users.getRow(2).getCell(4).value).toBe('+91 90000 00000');
    const hash = String(users.getRow(2).getCell(5).value);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('correct-horse-123');
    expect((await readFile(workbookPath)).includes(Buffer.from('correct-horse-123'))).toBe(false);
  });

  it('logs in case-insensitively and rejects bad credentials', async () => {
    await signup('Person@Example.com');
    const login = await request(app).post('/api/auth/login').send({
      email: 'person@example.com', password: 'correct-horse-123',
    });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('person@example.com');

    const rejected = await request(app).post('/api/auth/login').send({
      email: 'person@example.com', password: 'incorrect-password',
    });
    expect(rejected.status).toBe(401);
    expect(rejected.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('creates, reads, updates, lists and deletes appointments', async () => {
    const token = (await signup()).body.token;
    const auth = { Authorization: `Bearer ${token}` };
    const input = {
      title: 'Quarterly review', date: '2026-10-20', startTime: '09:00', endTime: '10:00',
      meetingWith: 'Anita', company: 'Acme', email: 'anita@example.com', mobile: '+1 555 0100',
      location: 'Conference Room 2', meetingUrl: 'https://meet.example.com/review', type: 'business',
      priority: 'high', status: 'scheduled', description: 'Review results', agenda: 'Metrics', notes: '',
      recurring: { frequency: 'monthly' }, reminder: 30,
    };
    const created = await request(app).post('/api/appointments').set(auth).send(input);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(input);
    expect(created.body.id).toEqual(expect.any(String));
    const storedWorkbook = new ExcelJS.Workbook();
    await storedWorkbook.xlsx.readFile(workbookPath);
    expect(storedWorkbook.getWorksheet('Appointments').getRow(2).getCell(4).value).toBe('20/Oct/2026');

    const fetched = await request(app).get(`/api/appointments/${created.body.id}`).set(auth);
    expect(fetched.status).toBe(200);
    expect(fetched.body.recurring).toEqual({ frequency: 'monthly' });

    const updated = await request(app).put(`/api/appointments/${created.body.id}`).set(auth).send({
      title: 'Updated review', status: 'completed', notes: 'All actions closed',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ title: 'Updated review', status: 'completed', date: input.date });

    const listed = await request(app).get('/api/appointments?status=completed').set(auth);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    expect((await request(app).delete(`/api/appointments/${created.body.id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/appointments/${created.body.id}`).set(auth)).status).toBe(404);
  });

  it('strictly isolates appointments and settings between users', async () => {
    const firstToken = (await signup('first@example.com', 'First User')).body.token;
    const secondToken = (await signup('second@example.com', 'Second User')).body.token;
    const firstAuth = { Authorization: `Bearer ${firstToken}` };
    const secondAuth = { Authorization: `Bearer ${secondToken}` };
    const created = await request(app).post('/api/appointments').set(firstAuth).send({
      title: 'Private meeting', date: '2026-11-01', startTime: '14:00', endTime: '15:00', reminder: true,
    });

    expect((await request(app).get('/api/appointments').set(secondAuth)).body).toEqual([]);
    expect((await request(app).get(`/api/appointments/${created.body.id}`).set(secondAuth)).status).toBe(404);
    expect((await request(app).put(`/api/appointments/${created.body.id}`).set(secondAuth).send({ title: 'Hijacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/appointments/${created.body.id}`).set(secondAuth)).status).toBe(404);

    expect((await request(app).put('/api/settings').set(firstAuth).send({ timezone: 'Asia/Kolkata', theme: 'dark' })).status).toBe(200);
    expect((await request(app).get('/api/settings').set(firstAuth)).body).toEqual({ timezone: 'Asia/Kolkata', theme: 'dark' });
    expect((await request(app).get('/api/settings').set(secondAuth)).body).toEqual({});
  });

  it('validates requests and requires authentication', async () => {
    expect((await request(app).get('/api/appointments')).status).toBe(401);
    const token = (await signup()).body.token;
    const invalid = await request(app).post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', date: 'not-a-date', startTime: '12:00', endTime: '11:00' });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details.length).toBeGreaterThan(1);
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
  });

  it('exports an isolated Excel report for the authenticated user', async () => {
    const token = (await signup()).body.token;
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/appointments').set(auth).send({
      title: 'Exported appointment', date: '2026-12-01', startTime: '10:00', endTime: '11:00',
    });
    const response = await request(app).get('/api/reports/excel').set(auth).buffer().parse((res, callback) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('spreadsheetml');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    expect(workbook.getWorksheet('Appointment Report').getRow(2).getCell(3).value).toBe('Exported appointment');
  });
});
