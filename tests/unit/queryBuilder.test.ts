import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from '../../src/app/builder/QueryBuilder';
import { ElasticQueryBuilder } from '../../src/app/builder/ElasticQueryBuilder';

const fakeQuery = () => {
  const query: any = {};
  query.find = vi.fn().mockReturnValue(query);
  query.sort = vi.fn().mockReturnValue(query);
  query.skip = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.select = vi.fn().mockReturnValue(query);
  return query;
};

describe('QueryBuilder', () => {
  it('applies search, filter, sort, and pagination', () => {
    const modelQuery = fakeQuery();
    const builder = new QueryBuilder(modelQuery, {
      searchTerm: 'jane',
      status: 'active',
      sort: 'email',
      page: '2',
      limit: '5',
      fields: 'email,role',
    });

    builder.search(['email', 'firstName']).filter().sort().paginate().fields();

    expect(modelQuery.find).toHaveBeenCalledWith({
      $or: [
        { email: { $regex: 'jane', $options: 'i' } },
        { firstName: { $regex: 'jane', $options: 'i' } },
      ],
    });
    expect(modelQuery.find).toHaveBeenCalledWith({ status: 'active' });
    expect(modelQuery.sort).toHaveBeenCalledWith('email');
    expect(modelQuery.skip).toHaveBeenCalledWith(5);
    expect(modelQuery.limit).toHaveBeenCalledWith(5);
    expect(modelQuery.select).toHaveBeenCalledWith('email role');
  });

  it('escapes search text and caps the page size at 60', () => {
    const modelQuery = fakeQuery();
    const builder = new QueryBuilder(modelQuery, {
      searchTerm: 'via.roma',
      limit: '500',
    });

    builder.search(['address']).paginate();

    expect(modelQuery.find).toHaveBeenCalledWith({
      $or: [{ address: { $regex: 'via\\.roma', $options: 'i' } }],
    });
    expect(modelQuery.limit).toHaveBeenCalledWith(60);
  });
});

describe('ElasticQueryBuilder', () => {
  it('builds a search query with pagination', () => {
    const built = new ElasticQueryBuilder({
      searchTerm: 'wallet',
      page: '2',
      limit: '5',
    })
      .search(['title', 'body'])
      .filter([{ term: { status: 'active' } }])
      .paginate()
      .build();

    expect(built.from).toBe(5);
    expect(built.size).toBe(5);
    expect(built.query.bool.must[0].multi_match.query).toBe('wallet');
    expect(built.query.bool.filter).toEqual([{ term: { status: 'active' } }]);
  });
});
