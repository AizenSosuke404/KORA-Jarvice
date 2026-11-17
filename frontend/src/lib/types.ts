export type AppSource = "sms" | "whatsapp";
export type ContactMode = "auto" | "brouillon" | "jamais";
export type Statut = "envoye" | "brouillon" | "annule" | "corrige";

export type Fournisseur = { id: string; nom: string; actif: boolean; configure: boolean };
export type GardeFous = { jamais_argent: boolean; jamais_rdv: boolean; confirmation_sensible: boolean };

export type Reglages = {
  user_id: string;
  theme: "sombre" | "clair";
  reponses_auto: boolean;
  pause_jusqua: string | null;
  fournisseurs_ia: Fournisseur[];
  garde_fous: GardeFous;
};
export type Contact = { id: string; nom: string; appli: AppSource; mode: ContactMode };
export type MessageTraite = {
  id: string; contact_nom: string; appli: AppSource; recu: string; reponse: string; statut: Statut; created_at: string;
};
export type Souvenir = { id: string; contenu: string; categorie: string; created_at: string };
export type Me = { id: string; email: string; nom: string; role: "admin" | "invite" };
export type Invitation = { code: string; expires_at: string; created_at: string };
