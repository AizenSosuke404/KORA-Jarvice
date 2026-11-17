import { Capacitor, registerPlugin } from "@capacitor/core";
import { API_BASE, getToken } from "@/lib/api";

/** État des autorisations Android (vrai = accordée). */
export type NativeStatus = {
  notificationAccess: boolean; // lire les notifications WhatsApp
  overlay: boolean;            // s'afficher par-dessus les autres applis
  battery: boolean;            // exemption d'optimisation de batterie
  sms: boolean;                // recevoir + envoyer des SMS
  notifications: boolean;      // afficher des notifications (Android 13+)
  serviceOn: boolean;          // service d'arrière-plan actif
  overlayOn: boolean;          // bulle flottante activée
};

interface KoraNativePlugin {
  getStatus(): Promise<NativeStatus>;
  configure(opts: { baseUrl: string; token: string }): Promise<void>;
  openNotificationAccess(): Promise<void>;
  requestOverlay(): Promise<void>;
  requestBattery(): Promise<void>;
  requestSms(): Promise<void>;
  requestNotifications(): Promise<void>;
  setService(opts: { enabled: boolean }): Promise<void>;
  setOverlay(opts: { enabled: boolean }): Promise<void>;
}

/** Vrai uniquement dans l'APK Android (pas dans le navigateur). */
export const isNative = () => Capacitor.isNativePlatform();

export const Native = registerPlugin<KoraNativePlugin>("KoraNative");

/** Donne à la partie native l'adresse du serveur et le jeton de connexion (pour répondre en arrière-plan). */
export async function syncNative() {
  if (!isNative()) return;
  const token = getToken();
  if (!token) return;
  try { await Native.configure({ baseUrl: API_BASE || window.location.origin, token }); } catch { /* ignoré */ }
}

export async function clearNative() {
  if (!isNative()) return;
  try { await Native.configure({ baseUrl: "", token: "" }); } catch { /* ignoré */ }
}
