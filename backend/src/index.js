import express from "express";
import fs from "node:fs";
import path from "node:path";
import { config, assertConfig } from "./config.js";
import { auth, errorHandler } from "./middleware.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import contactsRoutes from "./routes/contacts.js";
import invitationsRoutes from "./routes/invitations.js";
import messagesRoutes from "./routes/messages.js";
import reglagesRoutes from "./routes/reglages.js";
import souvenirsRoutes from "./routes/souvenirs.js";

assertConfig();

const app = express();
app.set("trust proxy", 1); // Render est derrière un proxy : nécessaire pour l'IP réelle
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" });
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      Vary: "Origin",
    });
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});

// Utilisé par UptimeRobot et le ping GitHub Actions : volontairement sans accès à la base.
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/reglages", auth, reglagesRoutes);
app.use("/api/contacts", auth, contactsRoutes);
app.use("/api/messages", auth, messagesRoutes);
app.use("/api/souvenirs", auth, souvenirsRoutes);
app.use("/api/invitations", auth, invitationsRoutes);
app.use("/api/chat", auth, chatRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "Route introuvable." }));

// Frontend React compilé (frontend/dist), servi par le même service.
const index = path.join(config.frontendDist, "index.html");
if (fs.existsSync(index)) {
  app.use(express.static(config.frontendDist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res) => res.sendFile(index));
} else {
  app.get("/", (req, res) => res.type("text").send("Kora backend en marche (frontend non compilé : cd frontend && npm run build)."));
}

app.use(errorHandler);

app.listen(config.port, () => console.log(`Kora backend sur le port ${config.port}`));
