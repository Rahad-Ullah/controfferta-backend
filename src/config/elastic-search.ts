import { Client } from '@elastic/elasticsearch';
import config from '.';

export const elasticSearch = new Client({
  node: config.elasticSearch.node,
  auth: {
    username: config.elasticSearch.auth.username as string,
    password: config.elasticSearch.auth.password as string,
  },
});
