import { defineConfig } from '@prisma/config';

export default defineConfig({
    migrations: {
        seed: 'npx tsx prisma/seed-admin.ts',
    },
});
