import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('HTTP edge', () => {
  it('serves the API docs outside production', async () => {
    const ui = await request(app).get('/api-docs/');
    expect(ui.status).toBe(200);

    const spec = await request(app).get('/api-docs/v1.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toEqual(expect.any(String));
  });

  it('sends helmet headers and still allows a cross-origin API call', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
