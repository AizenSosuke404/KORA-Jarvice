import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KoraLogo } from "@/components/kora/KoraLogo";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; provider?: string; error?: boolean };

const suggestions = ["Que peux-tu faire pour moi ?", "Aide-moi à écrire un message", "Que sais-tu sur moi ?"];

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: "Salut ! Je suis Kora. Que puis-je faire pour toi ?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const history = next.slice(1).filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
      const { reply, provider } = await api<{ reply: string; provider: string }>("/api/chat", { method: "POST", body: { messages: history } });
      setMessages((m) => [...m, { role: "assistant", content: reply, provider }]);
    } catch (err) {
      // Le message d'erreur reste affiché dans la conversation (un toast disparaît trop vite).
      const message = (err as Error).message;
      toast.error(message);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${message}`, error: true }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col animate-fade-up">
      <header className="flex items-center gap-3 border-b pb-3 pt-6">
        <KoraLogo className="h-8 w-8" />
        <div>
          <h1 className="font-display text-lg font-bold leading-none">Kora</h1>
          <p className="mt-1 text-xs text-muted-foreground">{busy ? "Réfléchit…" : "À l'écoute"}</p>
        </div>
      </header>
      <div className="flex-1 space-y-2 py-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm animate-fade-up",
            m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "glass")}>
            {m.content}
            {m.provider && <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">via {m.provider}</span>}
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">{s}</button>)}
          </div>
        )}
        {busy && <div className="glass w-16 rounded-2xl px-4 py-2 text-center animate-kora-blink">•••</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-20 flex gap-2 bg-background pb-2 pt-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écris à Kora…" className="h-12 rounded-2xl" />
        <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl" disabled={busy} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
