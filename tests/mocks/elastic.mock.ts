import { vi } from 'vitest';

export const elasticSearchMock = {
  index: vi.fn().mockResolvedValue({ result: 'created' }),
  search: vi.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  }),
  update: vi.fn().mockResolvedValue({ result: 'updated' }),
  delete: vi.fn().mockResolvedValue({ result: 'deleted' }),
  ping: vi.fn().mockResolvedValue(true),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/config/elastic-search', () => ({
  elasticSearch: elasticSearchMock,
}));
