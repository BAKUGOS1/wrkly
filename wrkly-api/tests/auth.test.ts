import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';

describe('Auth — POST /api/auth/register', () => {
  it('registers with valid data → 201 + token + user', async () => {
    const res = await inject({
      method: 'POST',
      url:    '/api/auth/register',
      payload: { email: 'alice@wrkly.test', name: 'Alice', password: 'password123' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe('alice@wrkly.test');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('duplicate email → 409', async () => {
    await inject({
      method:  'POST',
      url:     '/api/auth/register',
      payload: { email: 'dup@wrkly.test', name: 'Dup', password: 'password123' },
    });
    const res = await inject({
      method:  'POST',
      url:     '/api/auth/register',
      payload: { email: 'dup@wrkly.test', name: 'Dup2', password: 'password456' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('invalid email → 400', async () => {
    const res = await inject({
      method:  'POST',
      url:     '/api/auth/register',
      payload: { email: 'not-an-email', name: 'Bad', password: 'password123' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/validation/i);
  });

  it('short password → 400', async () => {
    const res = await inject({
      method:  'POST',
      url:     '/api/auth/register',
      payload: { email: 'short@wrkly.test', name: 'Short', password: 'abc' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Auth — POST /api/auth/login', () => {
  it('logs in with valid credentials → 200 + token', async () => {
    await createTestUser({ email: 'login@wrkly.test', password: 'mypassword' });

    const res = await inject({
      method:  'POST',
      url:     '/api/auth/login',
      payload: { email: 'login@wrkly.test', password: 'mypassword' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBeTruthy();
  });

  it('wrong password → 401', async () => {
    await createTestUser({ email: 'wrongpw@wrkly.test', password: 'correct' });

    const res = await inject({
      method:  'POST',
      url:     '/api/auth/login',
      payload: { email: 'wrongpw@wrkly.test', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('unknown email → 401', async () => {
    const res = await inject({
      method:  'POST',
      url:     '/api/auth/login',
      payload: { email: 'ghost@wrkly.test', password: 'password123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Auth — GET /api/auth/me', () => {
  it('valid token → 200 + user data', async () => {
    const user = await createTestUser();
    const res  = await inject({ method: 'GET', url: '/api/auth/me', ...auth(user.token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.id).toBe(user.id);
  });

  it('missing token → 401', async () => {
    const res = await inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('malformed token → 401', async () => {
    const res = await inject({
      method:  'GET',
      url:     '/api/auth/me',
      headers: { authorization: 'Bearer garbage.token.here' },
    });
    expect(res.statusCode).toBe(401);
  });
});
