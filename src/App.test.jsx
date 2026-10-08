import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('Suresh Appointment App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/login');
    vi.restoreAllMocks();
  });

  it('renders login and signup as the entry experience', () => {
    render(<App />);
    expect(screen.getAllByText('Suresh Appointment App').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
  });

  it('authenticates and loads the protected dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/auth/login') return { ok: true, status: 200, json: async () => ({ token: 'token', user: { id: '1', name: 'Suresh', email: 'suresh@example.com', createdAt: new Date().toISOString() } }) };
      if (url === '/api/appointments') return { ok: true, status: 200, json: async () => [] };
      if (url === '/api/settings') return { ok: true, status: 200, json: async () => ({ theme: 'light' }) };
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'suresh@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter workspace' }));
    await waitFor(() => expect(screen.getByText(/Good (morning|afternoon|evening), Suresh/)).toBeInTheDocument());
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });
});
