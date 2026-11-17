import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Moon, Sun, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/kora/PageHeader";
import { Invitations } from "@/components/kora/Invitations";
import { NativeSetup } from "@/components/kora/NativeSetup";
import { clearNative } from "@/lib/native";
import { setToken } from "@/lib/api";
import { applyTheme, reglagesQuery, updateReglages } from "@/lib/kora-data";
import type { Fournisseur, GardeFous } from "@/lib/types";
import { cn } from "@/lib/utils";

const gardeFousLabels: { k: keyof GardeFous; label: string }[] = [
  { k: "jamais_argent", label: "Ne jamais parler d'argent" },
  { k: "jamais_rdv", label: "Ne jamais fixer de rendez-vous" },
  { k: "confirmation_sensible", label: "Confirmation pour les actions sensibles" },
];

export default function Reglages() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: r } = useSuspenseQuery(reglagesQuery);
  const fournisseurs = r.fournisseurs_ia;
  const gf = r.garde_fous;

  async function save(patch: Record<string, unknown>, optimistic: Partial<typeof r> = {}) {
    qc.setQueryData(reglagesQuery.queryKey, { ...r, ...optimistic });
    try { qc.setQueryData(reglagesQuery.queryKey, await updateReglages(patch)); }
    catch (e) { toast.error((e as Error).message); qc.invalidateQueries({ queryKey: ["reglages"] }); }
  }
  // Pour les fournisseurs : on affiche tout de suite la liste complète, on n'envoie que { id, actif }.
  const saveProviders = (next: Fournisseur[]) =>
    save({ fournisseurs_ia: next.map(({ id, actif }) => ({ id, actif })) }, { fournisseurs_ia: next });

  function move(i: number, d: -1 | 1) {
    const next = [...fournisseurs];
    const j = i + d;
    const a = next[i]; const b = next[j];
    if (!a || !b) return;
    next[i] = b; next[j] = a;
    saveProviders(next);
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Réglages" />

      <NativeSetup />

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 font-semibold">Thème</h2>
        <div className="grid grid-cols-2 gap-2">
          {([{ v: "sombre", I: Moon, l: "Sombre" }, { v: "clair", I: Sun, l: "Clair" }] as const).map(({ v, I, l }) => (
            <button key={v} onClick={() => { applyTheme(v); save({ theme: v }, { theme: v }); }}
              className={cn("flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all", r.theme === v ? "border-primary text-primary shadow-glow" : "text-muted-foreground")}>
              <I className="h-4 w-4" />{l}
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="font-semibold">Fournisseurs IA</h2>
        <p className="mb-3 text-xs text-muted-foreground">Ordre de priorité · bascule automatique si l'un échoue · offres gratuites uniquement</p>
        <ul className="space-y-2">
          {fournisseurs.map((f, i) => (
            <li key={f.id} className="flex items-center gap-2 rounded-xl bg-muted p-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent font-display text-xs font-bold text-accent-foreground">{i + 1}</span>
              <div className="flex-1">
                <p className={cn("text-sm", !f.actif && "text-muted-foreground line-through")}>{f.nom}</p>
                {!f.configure && <p className="text-[10px] uppercase tracking-wide text-warning">Clé API manquante sur le serveur</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"><ChevronUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === fournisseurs.length - 1} aria-label="Descendre"><ChevronDown className="h-4 w-4" /></Button>
              <Switch checked={f.actif} onCheckedChange={(v) => saveProviders(fournisseurs.map((x) => (x.id === f.id ? { ...x, actif: v } : x)))} aria-label={`Activer ${f.nom}`} />
            </li>
          ))}
        </ul>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Garde-fous</h2>
        <ul className="space-y-3">
          {gardeFousLabels.map(({ k, label }) => (
            <li key={k} className="flex items-center justify-between gap-3">
              <span className="text-sm">{label}</span>
              <Switch checked={!!gf[k]} onCheckedChange={(v) => save({ garde_fous: { ...gf, [k]: v } }, { garde_fous: { ...gf, [k]: v } })} aria-label={label} />
            </li>
          ))}
        </ul>
      </section>

      <Invitations />
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { clearNative(); setToken(null); qc.clear(); navigate("/auth", { replace: true }); }}>
        <LogOut className="h-4 w-4" />Se déconnecter
      </Button>
    </div>
  );
}
