const TOKEN_KEY = "kora-token";

/** Vide en production (même adresse que le site) ; adresse Render pour l'APK Capacitor. */
export const API_BASE: string = import.meta.env.VITE_API_URL ?? "";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Connexion impossible. Vérifie ta connexion internet.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Jeton expiré ou invalide : retour à l'écran de connexion
    if (res.status === 401 && token && !path.startsWith("/api/auth/login")) {
      setToken(null);
      window.location.assign("/auth");
    }
    throw new Error(data?.error || `Erreur ${res.status}`);
  }
  return data as T;
}
