import React from "react";
import { createRoot } from "react-dom/client";
import { completeDesktopLogin } from "./desktopHandoff";
import "./styles.css";
if (!completeDesktopLogin()) void import('./App').then(({ default: App }) => createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
));
