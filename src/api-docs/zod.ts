import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Mutate Zod's prototypes once
extendZodWithOpenApi(z);

export { z };
export default z;
