import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Undo2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KoraOrb, type KoraState } from "@/components/kora/KoraOrb";
import { KoraLogo } from "@/components/kora/KoraLogo";
import { AppBadge } from "@/components/kora/AppBadge";
import { api } from "@/lib/api";
import { isPaused, messagesQuery, pauseUntil, reglagesQuery, timeAgo, updateReglages } from "@/lib/kora-data";
import type { MessageTraite } from "@/lib/types";

const statutLabel: Record<MessageTraite["statut"], string> = { envoye: "Envoyé", brouillon: "Brouillon à valider", annule: "Annulé", corrige: "Corrigé" };

export default function Accueil() {
  const qc = useQueryClient();
  const { data: r } = useSuspenseQuery(reglagesQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const paused = isPaused(r);
  const on = r.reponses_auto && !paused;
  const hasDraft = messages.some((m) => m.statut === "brouillon");
  const state: KoraState = !on ? "off" : hasDraft ? "reflechit" : "ecoute";

  async function save(patch: Record<string, unknown>) {
    try { qc.setQueryData(reglagesQuery.queryKey, await updateReglages(patch)); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="animate-fade-up">
      <header className="flex items-center gap-2 pt-6">
        <KoraLogo className="h-7 w-7" />
        <span className="font-display text-lg font-bold">Kora</span>
        <span className="ml-1 rounded-full border border-primary/40 px-2 text-[10px] uppercase tracking-widest text-primary">bêta</span>
      </header>

      <section className="py-4"><KoraOrb state={state} /></section>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Réponses auto</h2>
            <p className="text-sm text-muted-foreground">
              {paused ? `En pause jusqu'à ${new Date(r.pause_jusqua!).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : on ? "Kora répond pour toi" : "Kora ne répond pas"}
            </p>
          </div>
          <Switch className="h-9 w-16 [&>span]:h-7 [&>span]:w-7 data-[state=checked]:[&>span]:translate-x-7 data-[state=checked]:bg-primary" checked={r.reponses_auto} onCheckedChange={(v) => save({ reponses_auto: v })} aria-label="Réponses auto" />
        </div>
        <div className="mt-4 flex gap-2">
          {paused ? (
            <Button variant="secondary" className="flex-1" onClick={() => save({ pause_jusqua: null })}><Play className="h-4 w-4" />Reprendre</Button>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" disabled={!r.reponses_auto} onClick={() => save({ pause_jusqua: pauseUntil("1h").toISOString() })}><Pause className="h-4 w-4" />1 h</Button>
              <Button variant="secondary" className="flex-1" disabled={!r.reponses_auto} onClick={() => save({ pause_jusqua: pauseUntil("demain").toISOString() })}><Pause className="h-4 w-4" />Jusqu'à demain</Button>
            </>
          )}
        </div>
      </section>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Messages traités</h2>
      <ul className="space-y-3">
        {messages.length === 0 && <li className="text-sm text-muted-foreground">Aucun message pour l'instant.</li>}
        {messages.map((m) => <MessageCard key={m.id} m={m} />)}
      </ul>
    </div>
  );
}

function MessageCard({ m }: { m: MessageTraite }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.reponse);

  async function update(patch: Partial<Pick<MessageTraite, "statut" | "reponse">>, msg: string) {
    try {
      await api(`/api/messages/${m.id}`, { method: "PATCH", body: patch });
      toast.success(msg);
      setEdit(false);
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  const cancelled = m.statut === "annule";
  return (
    <li className="glass rounded-2xl p-4 animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{m.contact_nom}</span>
          <AppBadge appli={m.appli} />
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
      </div>
      <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">{m.recu}</p>
      {edit ? (
        <div className="mt-2 space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}><X className="h-4 w-4" />Fermer</Button>
            <Button size="sm" onClick={() => update({ reponse: text, statut: "corrige" }, "Réponse corrigée")}><Check className="h-4 w-4" />Valider</Button>
          </div>
        </div>
      ) : (
        <p className={`mt-2 ml-6 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground ${cancelled ? "line-through opacity-50" : ""}`}>{m.reponse}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs ${m.statut === "brouillon" ? "text-warning" : m.statut === "annule" ? "text-destructive" : "text-success"}`}>● {statutLabel[m.statut]}</span>
        {!edit && !cancelled && (
          <div className="flex gap-1">
            {m.statut === "brouillon" && <Button size="sm" variant="ghost" onClick={() => update({ statut: "envoye" }, "Brouillon envoyé")}><Check className="h-4 w-4" />Envoyer</Button>}
            <Button size="sm" variant="ghost" onClick={() => update({ statut: "annule" }, "Réponse annulée")}><Undo2 className="h-4 w-4" />Annuler</Button>
            <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Corriger</Button>
          </div>
        )}
      </div>
    </li>
  );
}
