import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, Bell, Check, ChevronRight, CircleCheck, EllipsisVertical, MessageSquare, MessageSquareText, Pause, Pencil, Play, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KoraLogo } from "@/components/kora/KoraLogo";
import { api } from "@/lib/api";
import { isPaused, meQuery, messagesQuery, pauseUntil, reglagesQuery, timeAgo, updateReglages } from "@/lib/kora-data";
import type { AppSource, MessageTraite } from "@/lib/types";
import { cn } from "@/lib/utils";

const statutLabel: Record<MessageTraite["statut"], string> = { envoye: "Répondu", brouillon: "Brouillon à valider", annule: "Annulé", corrige: "Corrigé" };

export default function Accueil() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: r } = useSuspenseQuery(reglagesQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const [all, setAll] = useState(false);
  const paused = isPaused(r);
  const on = r.reponses_auto && !paused;
  const drafts = messages.filter((m) => m.statut === "brouillon");
  const done = messages.filter((m) => m.statut !== "brouillon");
  const shownDone = all ? done : done.slice(0, 3);
  const hour = new Date().getHours();
  const salut = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const prenom = (me.nom || "").trim().split(" ")[0];

  async function save(patch: Record<string, unknown>) {
    try { qc.setQueryData(reglagesQuery.queryKey, await updateReglages(patch)); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex items-center gap-3 pt-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/50 bg-background shadow-glow"><KoraLogo className="h-8 w-8" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 text-xl font-bold leading-none">Kora <BadgeCheck className="h-5 w-5 text-primary" /></h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            Jarvice Bro <span className="opacity-50">•</span>
            <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground")} />
            <span className={on ? "text-success" : ""}>{on ? "En ligne" : paused ? "En pause" : "En veille"}</span>
          </p>
        </div>
        <button onClick={() => document.getElementById("a-repondre")?.scrollIntoView({ behavior: "smooth" })} aria-label="Messages à répondre" className="glass relative grid h-11 w-11 place-items-center rounded-full">
          <Bell className="h-5 w-5" />
          {drafts.length > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />}
        </button>
        <button onClick={() => navigate("/reglages")} aria-label="Réglages" className="glass grid h-11 w-11 place-items-center rounded-full"><EllipsisVertical className="h-5 w-5" /></button>
      </header>

      <section className="glass relative overflow-hidden rounded-3xl p-5 shadow-glow">
        <span className="absolute bottom-5 left-0 top-5 w-1 rounded-full bg-primary" />
        <KoraLogo className="pointer-events-none absolute -right-5 -top-5 h-40 w-40 opacity-15 animate-kora-pulse" />
        <h2 className="relative text-2xl font-bold">{salut}{prenom ? `, ${prenom}` : ""} 👋</h2>
        <p className="relative mt-1 italic text-muted-foreground">Je suis Kora, ton assistant personnel.<br />Que puis-je faire pour toi ?</p>
      </section>

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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CircleCheck className="h-6 w-6 text-primary" />Messages répondus récemment</h2>
          {done.length > 3 && <button onClick={() => setAll(!all)} className="flex items-center gap-1 text-sm font-semibold text-primary">{all ? "Réduire" : "Voir tout"}<ChevronRight className={cn("h-4 w-4 transition-transform", all && "rotate-90")} /></button>}
        </div>
        <ul className="space-y-3">
          {done.length === 0 && <li className="text-sm text-muted-foreground">Aucun message pour l'instant.</li>}
          {shownDone.map((m) => <MessageRow key={m.id} m={m} />)}
        </ul>
      </section>

      <section id="a-repondre" className="glass scroll-mt-4 rounded-3xl border-primary/30 p-4 shadow-glow">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <MessageSquareText className="h-6 w-6 text-primary" />Messages à répondre
          {drafts.length > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{drafts.length}</span>}
        </h2>
        <ul className="space-y-3">
          {drafts.length === 0 && <li className="py-2 text-sm text-muted-foreground">Rien à valider, Kora gère.</li>}
          {drafts.map((m) => <MessageRow key={m.id} m={m} draft />)}
        </ul>
      </section>
    </div>
  );
}

function AppIcon({ appli }: { appli: AppSource }) {
  const W = appli === "whatsapp";
  return (
    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full text-white", W ? "bg-emerald-500" : "bg-primary-glow")}>
      {W ? <MessageSquareText className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
    </span>
  );
}

function MessageRow({ m, draft = false }: { m: MessageTraite; draft?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.reponse);
  const cancelled = m.statut === "annule";
  const heure = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  async function update(patch: Partial<Pick<MessageTraite, "statut" | "reponse">>, msg: string) {
    try {
      await api(`/api/messages/${m.id}`, { method: "PATCH", body: patch });
      toast.success(msg);
      setEdit(false); setOpen(false);
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <li className="glass relative rounded-2xl p-3.5 animate-fade-up">
      <span className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-primary" />
      <div className="flex items-center gap-3">
        <AppIcon appli={m.appli} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{m.appli === "whatsapp" ? "WhatsApp" : "SMS"} <span className="opacity-50">•</span> <span className="font-medium text-primary">{m.contact_nom}</span></p>
          <p className="truncate text-sm text-foreground/90">{m.recu}</p>
          {!draft && (
            <p className={cn("mt-0.5 flex items-center gap-1.5 text-xs", cancelled ? "text-destructive" : "text-muted-foreground")}>
              <CircleCheck className={cn("h-3.5 w-3.5", cancelled ? "text-destructive" : "text-success")} />{statutLabel[m.statut]} <span className="opacity-50">•</span> {timeAgo(m.created_at)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {draft && <span className="text-xs text-muted-foreground">{heure}</span>}
          <button onClick={() => setOpen(!open)} aria-expanded={open}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", draft ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-primary/40 bg-accent/60 text-foreground")}>
            {draft ? <><Pencil className="h-4 w-4" />Répondre</> : <>Voir<ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} /></>}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {edit ? (
            <>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEdit(false)}><X className="h-4 w-4" />Fermer</Button>
                <Button size="sm" onClick={() => update({ reponse: text, statut: draft ? "envoye" : "corrige" }, draft ? "Réponse envoyée" : "Réponse corrigée")}><Check className="h-4 w-4" />{draft ? "Envoyer" : "Valider"}</Button>
              </div>
            </>
          ) : (
            <>
              <p className={cn("rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground", cancelled && "line-through opacity-50")}>{m.reponse}</p>
              {!cancelled && (
                <div className="flex justify-end gap-1">
                  {draft && <Button size="sm" variant="ghost" onClick={() => update({ statut: "envoye" }, "Brouillon envoyé")}><Check className="h-4 w-4" />Envoyer</Button>}
                  <Button size="sm" variant="ghost" onClick={() => update({ statut: "annule" }, "Réponse annulée")}><Undo2 className="h-4 w-4" />Annuler</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Corriger</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
