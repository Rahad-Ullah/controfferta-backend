import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { DisclaimerType } from '../../src/app/modules/disclaimer/disclaimer.constants';
import { Disclaimer } from '../../src/app/modules/disclaimer/disclaimer.model';
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

    const missing = await request(app).get(
      `/api/v1/disclaimers/${DisclaimerType.TermsOfService}`,
    );
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Disclaimer not found');

    const userDisclaimer = await request(app)
      .post('/api/v1/disclaimers')
      .set('Authorization', authHeader(userToken))
      .send({
        type: DisclaimerType.PrivacyPolicy,
        content: 'We store account data.',
      });
    expect(userDisclaimer.status).toBe(403);

    const unknownType = await request(app)
      .post('/api/v1/disclaimers')
      .set('Authorization', authHeader(adminToken))
      .send({ type: 'about_us', content: 'About the site.' });
    expect(unknownType.status).toBe(400);
    expect(unknownType.body.success).toBe(false);

    const disclaimer = await request(app)
      .post('/api/v1/disclaimers')
      .set('Authorization', authHeader(adminToken))
      .send({
        type: DisclaimerType.PrivacyPolicy,
        content: 'We store account data.',
      });
    expect(disclaimer.status).toBe(200);
    expect(disclaimer.body.message).toBe('Disclaimer updated successfully');

    const publicDisclaimer = await request(app).get(
      `/api/v1/disclaimers/${DisclaimerType.PrivacyPolicy}`,
    );
    expect(publicDisclaimer.status).toBe(200);
    expect(publicDisclaimer.body.message).toBe(
      'Disclaimer fetched successfully',
    );
    expect(publicDisclaimer.body.data.content).toBe('We store account data.');

    const updated = await request(app)
      .post('/api/v1/disclaimers')
      .set('Authorization', authHeader(adminToken))
      .send({
        type: DisclaimerType.PrivacyPolicy,
        content: 'We store account data for credits.',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data._id).toBe(disclaimer.body.data._id);
    expect(updated.body.data.content).toBe(
      'We store account data for credits.',
    );
    expect(await Disclaimer.countDocuments()).toBe(1);

    const settings = await request(app).get('/api/v1/settings');
    expect(settings.status).toBe(200);

    const saved = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', authHeader(adminToken))
      .send({
        welcomeCreditAmount: 20,
        contactInfo: {
          email: 'hello@example.com',
          phone: '+390212345678',
          address: { line1: 'Via Roma 1', city: 'Milano' },
          location: { coordinates: [9.19, 45.46] },
        },
        socialLinks: { facebook: 'https://facebook.com/controfferta' },
      });
    expect(saved.status).toBe(200);
    expect(saved.body.message).toBe('Setting updated successfully');
    expect(saved.body.data.welcomeCreditAmount).toBe(20);
    expect(saved.body.data.contactInfo.email).toBe('hello@example.com');
    expect(saved.body.data.contactInfo.address.city).toBe('Milano');
    expect(saved.body.data.contactInfo.location.type).toBe('Point');
    expect(saved.body.data.socialLinks.facebook).toBe(
      'https://facebook.com/controfferta',
    );

    const creditsOnly = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', authHeader(adminToken))
      .send({ welcomeCreditAmount: 15 });
    expect(creditsOnly.status).toBe(200);
    expect(creditsOnly.body.data.welcomeCreditAmount).toBe(15);
    expect(creditsOnly.body.data.contactInfo.email).toBe('hello@example.com');

    const userSettings = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', authHeader(userToken))
      .send({ contactInfo: { email: 'nope@example.com' } });
    expect(userSettings.status).toBe(403);
  });
});
