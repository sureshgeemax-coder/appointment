import { describe, expect, it } from 'vitest';
import { matchesAppointment, validateAppointment } from './appointment';

describe('appointment utilities', () => {
  it('validates required, chronological and contact fields', () => {
    const errors = validateAppointment({ title: '', date: '', startTime: '11:00', endTime: '10:00', email: 'invalid', meetingUrl: 'ftp://invalid' });
    expect(errors).toMatchObject({ title: expect.any(String), date: expect.any(String), endTime: expect.any(String), email: expect.any(String), meetingUrl: expect.any(String) });
  });

  it('searches across useful appointment fields', () => {
    const item = { title: 'Strategy review', meetingWith: 'Anita', company: 'Acme', location: 'Board room', type: 'business' };
    expect(matchesAppointment(item, 'anita')).toBe(true);
    expect(matchesAppointment(item, 'board')).toBe(true);
    expect(matchesAppointment(item, 'holiday')).toBe(false);
  });
});
