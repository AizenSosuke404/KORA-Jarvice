import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Native, isNative, type NativeStatus } from "@/lib/native";

type Row = { key: keyof NativeStatus; titre: string; aide: string; action: () => Promise<void> };

const rows: Row[] = [
  { key: "notificationAccess", titre: "Lire les notifications", aide: "Indispensable : c'est ainsi que Kora voit tes messages WhatsApp et y répond. Si l'option est grisée : Infos de l'appli Kora → ⋮ → « Autoriser les paramètres restreints », puis reviens ici.", action: () => Native.openNotificationAccess() },
  { key: "sms", titre: "SMS", aide: "Recevoir et envoyer des SMS à ta place (et lire les noms de tes contacts).", action: () => Native.requestSms() },
  { key: "notifications", titre: "Notifications de Kora", aide: "Pour afficher les brouillons à valider et le statut du service.", action: () => Native.requestNotifications() },
  { key: "battery", titre: "Sans limite de batterie", aide: "Empêche Android de couper Kora en arrière-plan.", action: () => Native.requestBattery() },
  { key: "overlay", titre: "Affichage par-dessus les applis", aide: "Nécessaire pour la bulle Kora flottante.", action: () => Native.requestOverlay() },
];

/** Réglages propres à l'APK Android : autorisations + service d'arrière-plan + bulle flottante. */
export function NativeSetup() {
  const [st, setSt] = useState<NativeStatus | null>(null);

  const refresh = useCallback(async () => {
    try { setSt(await Native.getStatus()); } catch { /* ignoré */ }
  }, []);

  useEffect(() => {
    refresh();
    // On revient des réglages Android : on relit les autorisations.
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  if (!isNative()) {
    return (
      <section className="glass rounded-2xl p-4">
        <h2 className="font-semibold">Sur ton téléphone</h2>
        <p className="mt-1 text-xs text-muted-foreground">Pour que Kora réponde en arrière-plan (WhatsApp, SMS, bulle flottante), installe l'application Android Kora : GitHub → Releases → « Kora APK ».</p>
      </section>
    );
  }
  if (!st) return null;

  const missing = rows.filter((r) => !st[r.key]).length;

  async function toggle(kind: "service" | "overlay", enabled: boolean) {
    try {
      if (kind === "service") await Native.setService({ enabled });
      else await Native.setOverlay({ enabled });
    } catch (e) { toast.error((e as Error).message); }
    refresh();
  }

  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="font-semibold">Sur ce téléphone</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {missing === 0 ? "Toutes les autorisations sont accordées." : `${missing} autorisation${missing > 1 ? "s" : ""} à accorder pour que Kora fonctionne bien.`}
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{st[r.key] ? "✅" : "⚠️"} {r.titre}</p>
              <p className="text-xs text-muted-foreground">{r.aide}</p>
            </div>
            {!st[r.key] && (
              <Button size="sm" variant="secondary" onClick={async () => { try { await r.action(); } catch (e) { toast.error((e as Error).message); } setTimeout(refresh, 800); }}>Autoriser</Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Service d'arrière-plan<span className="block text-xs text-muted-foreground">Garde Kora active même app fermée</span></span>
          <Switch checked={st.serviceOn} onCheckedChange={(v) => toggle("service", v)} aria-label="Service d'arrière-plan" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Bulle flottante<span className="block text-xs text-muted-foreground">Raccourci Kora au-dessus des autres applis</span></span>
          <Switch checked={st.overlayOn} disabled={!st.overlay} onCheckedChange={(v) => toggle("overlay", v)} aria-label="Bulle flottante" />
        </div>
      </div>
    </section>
  );
}
