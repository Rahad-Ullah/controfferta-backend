import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import config from '../../src/config';

describe('HTTP edge', () => {
  it('serves the API docs outside production', async () => {
    const ui = await request(app).get('/api-docs/');
    expect(ui.status).toBe(200);

    const spec = await request(app).get('/api-docs/v1.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toEqual(expect.any(String));
  });

  it('sends helmet headers and allows the configured web origin', async () => {
    const webOrigin = new URL(config.frontend_url as string).origin;
    const res = await request(app).get('/').set('Origin', webOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe(webOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');

    const blocked = await request(app)
      .get('/')
      .set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(200);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the dashboard and any localhost origin in development', async () => {
    const previousDashboard = config.dashboard_url;
    const previousEnv = config.node_env;
    config.dashboard_url = 'https://dashboard.controfferta.test';

    try {
      const dashboard = await request(app)
        .get('/')
        .set('Origin', 'https://dashboard.controfferta.test');
      expect(dashboard.headers['access-control-allow-origin']).toBe(
        'https://dashboard.controfferta.test',
      );

      config.node_env = 'development';
      const local = await request(app)
        .get('/')
        .set('Origin', 'http://127.0.0.1:3001');
      expect(local.headers['access-control-allow-origin']).toBe(
        'http://127.0.0.1:3001',
      );

      config.node_env = 'production';
      const blocked = await request(app)
        .get('/')
        .set('Origin', 'http://127.0.0.1:3001');
      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      config.dashboard_url = previousDashboard;
      config.node_env = previousEnv;
    }
  });
});
