import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("Erreur d'affichage Kora :", error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="glass mt-10 space-y-3 rounded-2xl p-4 text-center">
        <p className="font-semibold">Oups, ça n'a pas chargé</p>
        <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
        <Button onClick={() => this.setState({ error: null })}>Réessayer</Button>
      </div>
    );
  }
}
