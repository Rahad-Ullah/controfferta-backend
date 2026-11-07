import { vi } from 'vitest';

export const putObjectSpy = vi.fn(function putObject(args) {
  return args;
});
export const deleteObjectSpy = vi.fn(function deleteObject(args) {
  return args;
});
export const s3SendSpy = vi.fn(function s3Send() {
  return Promise.resolve({});
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function S3Client() {
    return { send: s3SendSpy };
  }),
  PutObjectCommand: putObjectSpy,
  DeleteObjectCommand: deleteObjectSpy,
}));
