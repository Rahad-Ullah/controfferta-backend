import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    isolate: true,
    include: ['tests/**/*.test.ts', 'src/**/*.{spec,test}.ts'],
    env: {
      NODE_ENV: 'test',
      SERVER_NAME: 'Controfferta',
      BCRYPT_SALT_ROUNDS: '10',
      JWT_SECRET: 'test_jwt_secret',
      JWT_EXPIRE_IN: '1d',
      JWT_REFRESH_SECRET: 'test_jwt_refresh_secret',
      JWT_REFRESH_EXPIRE_IN: '7d',
      CRYPTO_SECRET:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_API_VERSION: '2024-06-20',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test_mock_aws_access_key',
      AWS_SECRET_ACCESS_KEY: 'test_mock_aws_secret_key',
      S3_BUCKET_NAME: 'test-bucket',
      ELASTICSEARCH_NODE: 'http://127.0.0.1:9200',
      MEDIA_SERVER_URL: 'http://localhost:5001',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'tests/**',
        'src/server.ts',
        'src/dev-server.ts',
      ],
    },
  },
});
