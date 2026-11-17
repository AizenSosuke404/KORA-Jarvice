import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Undo2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KoraLogo } from "@/components/kora/KoraLogo";
import { AppBadge } from "@/components/kora/AppBadge";
import { api } from "@/lib/api";
import { isPaused, messagesQuery, pauseUntil, reglagesQuery, timeAgo, updateReglages } from "@/lib/kora-data";
import type { MessageTraite } from "@/lib/types";
import { cn } from "@/lib/utils";

const statutLabel: Record<MessageTraite["statut"], string> = { envoye: "Envoyé", brouillon: "À valider", annule: "Annulé", corrige: "Corrigé" };

export default function Accueil() {
  const qc = useQueryClient();
  const { data: r } = useSuspenseQuery(reglagesQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const paused = isPaused(r);
  const on = r.reponses_auto && !paused;
  const drafts = messages.filter((m) => m.statut === "brouillon");
  const done = messages.filter((m) => m.statut !== "brouillon");

  async function save(patch: Record<string, unknown>) {
    try { qc.setQueryData(reglagesQuery.queryKey, await updateReglages(patch)); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-3">
          <KoraLogo className="h-9 w-9" />
          <div>
            <h1 className="font-display text-xl font-bold leading-none">Kora</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground")} />
              {on ? "À l'écoute" : paused ? "En pause" : "En veille"}
            </p>
          </div>
        </div>
      </header>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Réponses auto</h2>
            <p className="text-sm text-muted-foreground">
              {paused ? `En pause jusqu'à ${new Date(r.pause_jusqua!).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : on ? "Kora répond pour toi" : "Kora ne répond pas"}
            </p>
          </div>
          <Switch checked={r.reponses_auto} onCheckedChange={(v) => save({ reponses_auto: v })} aria-label="Réponses auto" />
        </div>
        <div className="mt-3 flex gap-2">
          {paused ? (
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => save({ pause_jusqua: null })}><Play className="h-4 w-4" />Reprendre</Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" className="flex-1" disabled={!r.reponses_auto} onClick={() => save({ pause_jusqua: pauseUntil("1h").toISOString() })}><Pause className="h-4 w-4" />Pause 1 h</Button>
              <Button size="sm" variant="secondary" className="flex-1" disabled={!r.reponses_auto} onClick={() => save({ pause_jusqua: pauseUntil("demain").toISOString() })}><Pause className="h-4 w-4" />Jusqu'à demain</Button>
            </>
          )}
        </div>
      </section>

      {drafts.length > 0 && (
        <section>
          <SectionTitle title="À valider" count={drafts.length} />
          <ul className="space-y-2">{drafts.map((m) => <MessageCard key={m.id} m={m} />)}</ul>
        </section>
      )}

      <section>
        <SectionTitle title="Répondus récemment" />
        <ul className="space-y-2">
          {done.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun message pour l'instant.</li>}
          {done.map((m) => <MessageCard key={m.id} m={m} />)}
        </ul>
      </section>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      {title}
      {count ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">{count}</span> : null}
    </h2>
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
    <li className="glass rounded-2xl p-3.5 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">{m.contact_nom[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{m.contact_nom}</span>
            <AppBadge appli={m.appli} />
          </div>
          <p className="truncate text-sm text-muted-foreground">{m.recu}</p>
        </div>
        <span className="shrink-0 self-start text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
      </div>

      {edit ? (
        <div className="mt-3 space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}><X className="h-4 w-4" />Fermer</Button>
            <Button size="sm" onClick={() => update({ reponse: text, statut: "corrige" }, "Réponse corrigée")}><Check className="h-4 w-4" />Valider</Button>
          </div>
        </div>
      ) : (
        <p className={cn("mt-3 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground", cancelled && "line-through opacity-50")}>{m.reponse}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-xs font-medium", m.statut === "brouillon" ? "text-warning" : cancelled ? "text-destructive" : "text-success")}>{statutLabel[m.statut]}</span>
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
