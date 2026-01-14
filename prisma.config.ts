import { defineConfig } from 'prisma/config';

/**
 * Config do Prisma (substitui `package.json#prisma`, que será removido no Prisma 7).
 *
 * Mantém o seed em TypeScript por simplicidade e legibilidade.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
});


