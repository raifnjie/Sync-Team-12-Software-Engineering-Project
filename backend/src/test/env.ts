import dotenv from "dotenv";

// Runs before every test file: point the app at the test database, never the dev one.
dotenv.config({ quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
