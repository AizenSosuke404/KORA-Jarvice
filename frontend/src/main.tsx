import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import { applyTheme, storedTheme } from "@/lib/kora-data";

applyTheme(storedTheme()); // évite le flash de thème au chargement

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
