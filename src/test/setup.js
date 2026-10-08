import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }),
});

class NotificationMock {
  static permission = 'default';
  static requestPermission = async () => 'granted';
}

Object.defineProperty(window, 'Notification', { writable: true, value: NotificationMock });
Object.defineProperty(globalThis, 'Notification', { writable: true, value: NotificationMock });
