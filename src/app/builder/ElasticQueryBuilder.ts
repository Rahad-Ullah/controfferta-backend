export class ElasticQueryBuilder {
  private queryObj: any = { bool: { must: [], filter: [] } };
  private sortObj: any[] = [];
  private fromVal = 0;
  private sizeVal = 10;

  constructor(private rawQuery: Record<string, unknown>) {}

  search(fields: string[]) {
    const term = (this.rawQuery.searchTerm || this.rawQuery.search) as string;
    if (term) {
      this.queryObj.bool.must.push({
        multi_match: { query: term, fields, fuzziness: 'AUTO' },
      });
    } else {
      this.queryObj.bool.must.push({ match_all: {} });
    }
    return this;
  }

  filter(conditions: any[]) {
    this.queryObj.bool.filter.push(...conditions);
    return this;
  }

  paginate() {
    const page = Math.max(Number(this.rawQuery.page) || 1, 1);
    const limit = Math.max(Number(this.rawQuery.limit) || 10, 1);
    this.fromVal = (page - 1) * limit;
    this.sizeVal = limit;
    return this;
  }

  build() {
    return {
      query: this.queryObj,
      from: this.fromVal,
      size: this.sizeVal,
      sort: this.sortObj.length ? this.sortObj : undefined,
    };
  }
}
