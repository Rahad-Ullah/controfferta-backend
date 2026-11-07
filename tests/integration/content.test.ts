import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { DisclaimerType } from '../../src/app/modules/disclaimer/disclaimer.constants';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('FAQ, disclaimer, and settings', () => {
  it('serves public reads and restricts writes to admins', async () => {
    const { token: userToken } = await createTestUser();
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const publicFaqs = await request(app).get('/api/v1/faqs');
    expect(publicFaqs.status).toBe(200);

    const userWrite = await request(app)
      .post('/api/v1/faqs/create')
      .set('Authorization', authHeader(userToken))
      .send({
        question: 'What is Controfferta?',
        answer: 'A marketplace for verified Italian companies.',
      });
    expect(userWrite.status).toBe(403);

    const faq = await request(app)
      .post('/api/v1/faqs/create')
      .set('Authorization', authHeader(adminToken))
      .send({
        question: 'What is Controfferta?',
        answer: 'A marketplace for verified Italian companies.',
      });
    expect(faq.status).toBe(201);

    const one = await request(app).get(`/api/v1/faqs/${faq.body.data._id}`);
    expect(one.status).toBe(200);
    expect(one.body.data.question).toBe('What is Controfferta?');

    const disclaimer = await request(app)
      .post('/api/v1/disclaimers')
      .set('Authorization', authHeader(adminToken))
      .send({
        type: DisclaimerType.PrivacyPolicy,
        content: 'We store account data.',
      });
    expect(disclaimer.status).toBe(200);

    const publicDisclaimer = await request(app).get(
      `/api/v1/disclaimers/${DisclaimerType.PrivacyPolicy}`,
    );
    expect(publicDisclaimer.status).toBe(200);
    expect(publicDisclaimer.body.data.content).toBe('We store account data.');

    const settings = await request(app).get('/api/v1/settings');
    expect(settings.status).toBe(200);

    const saved = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', authHeader(adminToken))
      .send({
        contactInfo: { email: 'hello@example.com' },
      });
    expect(saved.status).toBe(200);
    expect(saved.body.data.contactInfo.email).toBe('hello@example.com');

    const userSettings = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', authHeader(userToken))
      .send({ contactInfo: { email: 'nope@example.com' } });
    expect(userSettings.status).toBe(403);
  });
});
