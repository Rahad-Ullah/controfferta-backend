import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';
import { harness } from '../harness';

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe('Media upload API', () => {
  it('stores an image through the mocked S3 client', async () => {
    const { token } = await createTestUser();
    harness().putObjectSpy.mockClear();
    harness().redisMock.pipeline.mockClear();

    const res = await request(app)
      .post('/api/v1/media-uploads/upload')
      .set('Authorization', authHeader(token))
      .attach('image', pngSignature, {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.data.images).toHaveLength(1);
    expect(harness().putObjectSpy).toHaveBeenCalled();
    expect(harness().redisMock.pipeline).toHaveBeenCalled();
  });

  it('rejects a file whose bytes do not match an image', async () => {
    const { token } = await createTestUser({ email: 'uploader@example.com' });
    harness().putObjectSpy.mockClear();

    const res = await request(app)
      .post('/api/v1/media-uploads/upload')
      .set('Authorization', authHeader(token))
      .attach('image', Buffer.from('<html></html>'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      'Only .jpeg, .png, .jpg, .heic, and .heics files are supported!',
    );
    expect(harness().putObjectSpy).not.toHaveBeenCalled();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/v1/media-uploads/upload')
      .attach('image', Buffer.from('png'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(401);
  });
});
