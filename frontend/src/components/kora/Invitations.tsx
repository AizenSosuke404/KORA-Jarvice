import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE, api } from "@/lib/api";
import { meQuery } from "@/lib/kora-data";
import type { Invitation } from "@/lib/types";

const pretty = (c: string) => `${c.slice(0, 5)}-${c.slice(5)}`;

/** Réservé au propriétaire : génère des codes d'invitation à usage unique (valables 7 jours). */
export function Invitations() {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQuery);
  const isAdmin = me?.role === "admin";
  const { data: codes } = useQuery({ queryKey: ["invitations"], queryFn: () => api<Invitation[]>("/api/invitations"), enabled: isAdmin });
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;

  async function create() {
    setBusy(true);
    try {
      await api("/api/invitations", { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["invitations"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  async function copy(code: string) {
    const site = API_BASE || window.location.origin;
    try {
      await navigator.clipboard.writeText(`Rejoins Kora : ${site}\nCode d'invitation : ${pretty(code)} (valable 7 jours)`);
      toast.success("Invitation copiée, colle-la dans WhatsApp");
    } catch { toast.error("Copie impossible"); }
  }

  return (
    <section className="space-y-3 border-t border-border pt-5">
      <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4 text-primary" />Invitations</h2>
      <p className="text-xs text-muted-foreground">Un code = une personne, valable 7 jours.</p>
      <Button onClick={create} disabled={busy} className="w-full"><UserPlus className="h-4 w-4" />{busy ? "Création…" : "Créer un code d'invitation"}</Button>
      <ul className="space-y-2">
        {(codes ?? []).map((c) => (
          <li key={c.code} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <span className="font-display tracking-widest">{pretty(c.code)}</span>
            <Button size="icon" variant="ghost" onClick={() => copy(c.code)} aria-label="Copier l'invitation"><Copy className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
