import "dotenv/config";
import { seed } from "../src/db/seed";

// `npm run db:seed` (Prisma runs this file; the logic lives in src/db/seed.ts)
seed()
  .then(() => console.log("Seeded catalog and demo accounts (password: password123)."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
