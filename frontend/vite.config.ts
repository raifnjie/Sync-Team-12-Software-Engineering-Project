import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config: turns on React and Tailwind
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Settings for the automated tests (npm test)
  test: {
    environment: "jsdom",
  },
});
