import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config: turns on React and Tailwind
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
