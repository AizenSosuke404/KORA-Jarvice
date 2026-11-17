# Kora — assistant personnel IA (Jarvis)

Kora répond aux SMS et messages WhatsApp quand tu l'autorises. Cette version contient l'interface
(reprise du design Lovable), le backend, la base de données et le multi-IA.
Même organisation que Kalchat : `backend/` + `frontend/` + `render.yaml`, Supabase = base de données
uniquement, tout passe par le backend sur Render. Projet à 0 € (offres gratuites).

```
kora/
├─ backend/            API Express (Node 20+) : auth, données, chat, multi-IA
│  └─ src/
│     ├─ index.js          démarrage, sert aussi le frontend compilé
│     ├─ routes/           auth, reglages, contacts, messages, souvenirs, invitations, chat
│     ├─ ai/               providers.js (registre) · index.js (bascule auto) · prompt.js
│     └─ security.js       mots de passe (scrypt), jetons JWT, limiteur de requêtes
├─ frontend/           React + Vite + Tailwind (design Kora : thème sombre/clair)
│  └─ src/pages/           Accueil, Contacts, Chat, Mémoire, Réglages, Auth
├─ supabase/schema.sql un seul script SQL (schéma « kora », n'interfère pas avec Kalchat)
├─ render.yaml         déploiement Render (service web gratuit)
└─ .github/workflows/ping.yml   garde Render réveillé
```

## 1. Base de données (Supabase)
1. Supabase > SQL Editor > colle et lance `supabase/schema.sql`.
2. Supabase > Connect > copie l'URI **Session pooler** (Render n'a pas d'IPv6, l'URI « Direct » ne marchera pas) :
   ce sera `DATABASE_URL`.

## 2. Déploiement (Render)
1. Pousse ce dossier sur GitHub, puis Render > New > Blueprint (il lit `render.yaml`).
2. Renseigne les variables : `DATABASE_URL`, `SETUP_CODE` (un code secret de ton choix) et au moins une clé IA
   (`GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` ou `OPENROUTER_API_KEY`). `JWT_SECRET` est généré tout seul.
3. Ouvre le site : au tout premier lancement, l'écran demande le `SETUP_CODE` pour créer **ton** compte propriétaire
   (possible une seule fois). Ensuite, Réglages > Invitations génère des codes à usage unique pour tes invités.
4. Ping : GitHub > Settings > Secrets and variables > Actions > **Variables** > `APP_URL` = l'adresse Render.
   (Tu peux aussi ajouter `/health` dans UptimeRobot.)

## 3. Travailler en local
```
cd backend  && cp .env.example .env && npm install && npm run dev     # http://localhost:3000
cd frontend && npm install && npm run dev                             # http://localhost:5173 (proxy vers l'API)
cd backend  && npm test                                               # tests (sécurité, bascule IA)
```

## Ajouter un modèle / fournisseur d'IA
Tous parlent le format OpenAI : ajoute une entrée dans `backend/src/ai/providers.js` (nom, URL, variable de clé,
modèle par défaut) et la clé dans Render. Il apparaît tout seul dans Réglages > Fournisseurs IA, où tu choisis
l'ordre et l'activation. Si l'un échoue (quota, panne, lenteur), Kora passe automatiquement au suivant.
Les modèles par défaut se changent sans code via `GROQ_MODEL`, `GEMINI_MODEL`, `MISTRAL_MODEL`, `OPENROUTER_MODEL`.

## Avancement (cahier des charges en 9 phases)
1. Fondations ✅ · 2. Interface ✅ (bêta) · 3. Multi-IA ✅ (chat) · 4. Mémoire 🟡 (souvenirs lus par l'IA ; apprentissage auto à faire)
5. Vision/OCR ⬜ · 6. Voix ⬜ · 7. Compétences ⬜ · 8. Actions Android (lecture des notifications, réponses auto) ⬜ · 9. APK Capacitor ⬜
(l'APK se fera comme Kalchat : dossier `mobile/` + workflow GitHub Actions ; `VITE_API_URL` pointera vers Render).

## Notes
- Pas de « mot de passe oublié » pour l'instant (aucun service d'e-mail) ; à brancher avec Resend + ton domaine plus tard.
- Aucune clé API dans le frontend : elles ne vivent que dans les variables d'environnement Render.
