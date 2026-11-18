import dotenv from "dotenv";

// Load environment variables from .env file into process.env
dotenv.config();

// Export centralized, typed config object with sensible fallbacks
export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  jwtSecret: process.env.JWT_SECRET || "sync_dev_secret_change_in_production",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
};

