import { fileURLToPath } from "node:url";

const env = process.env;

export const config = {
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL || "",
  jwtSecret: env.JWT_SECRET || "",
  setupCode: env.SETUP_CODE || "",
  corsOrigins: (env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  frontendDist: env.FRONTEND_DIST || fileURLToPath(new URL("../../frontend/dist", import.meta.url)),
};

/** Arrête le serveur avec un message clair si la configuration est incomplète. */
export function assertConfig() {
  const problems = [];
  if (!config.databaseUrl) problems.push("DATABASE_URL manquant (URI « Session pooler » de Supabase)");
  if (config.jwtSecret.length < 32) problems.push("JWT_SECRET manquant ou trop court (32 caractères minimum)");
  if (problems.length) {
    console.error("Configuration invalide :\n - " + problems.join("\n - "));
    process.exit(1);
  }
}
