import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Remove the rendered page from the fake browser after every test
afterEach(() => {
  cleanup();
});
