import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./react/app";

// Start React and show <App /> inside the #root div in index.html
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
