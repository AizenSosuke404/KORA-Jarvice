import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact, MessageTraite, Me, Reglages, Souvenir } from "@/lib/types";

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => api<Me>("/api/auth/me") });
export const reglagesQuery = queryOptions({ queryKey: ["reglages"], queryFn: () => api<Reglages>("/api/reglages") });
export const contactsQuery = queryOptions({ queryKey: ["contacts"], queryFn: () => api<Contact[]>("/api/contacts") });
export const messagesQuery = queryOptions({ queryKey: ["messages"], queryFn: () => api<MessageTraite[]>("/api/messages") });
export const souvenirsQuery = queryOptions({ queryKey: ["souvenirs"], queryFn: () => api<Souvenir[]>("/api/souvenirs") });

export const updateReglages = (patch: Record<string, unknown>) => api<Reglages>("/api/reglages", { method: "PATCH", body: patch });

/** Pause active tant que pause_jusqua est dans le futur. */
export function isPaused(r: Pick<Reglages, "pause_jusqua"> | null | undefined, now = new Date()) {
  return !!r?.pause_jusqua && new Date(r.pause_jusqua) > now;
}

export function pauseUntil(kind: "1h" | "demain", now = new Date()) {
  if (kind === "1h") return new Date(now.getTime() + 3600_000);
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const THEME_KEY = "kora-theme";
export const storedTheme = () => localStorage.getItem(THEME_KEY) ?? "sombre";
export function applyTheme(theme: string | undefined) {
  if (!theme) return;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("light", theme === "clair");
}

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}
