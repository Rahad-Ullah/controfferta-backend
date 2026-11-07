import { vi } from 'vitest';

const { sendMailSpy } = vi.hoisted(() => ({
  sendMailSpy: vi.fn(function sendMail() {
    return Promise.resolve({
      messageId: 'mock-email-id',
      accepted: ['jane.doe@example.com'],
    });
  }),
}));

export { sendMailSpy };

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(function createTransport() {
      return {
        sendMail: sendMailSpy,
        verify: vi.fn(function verify() {
          return Promise.resolve(true);
        }),
      };
    }),
  },
}));
