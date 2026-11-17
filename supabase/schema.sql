-- Kora : UN SEUL script à lancer dans Supabase > SQL Editor.
-- Tout vit dans un schéma dédié « kora » : aucun risque de toucher aux tables de Kalchat,
-- même si tu utilises le même projet Supabase. Supabase sert uniquement de base de données :
-- seul le backend Render s'y connecte (RLS activé sans politique = accès direct bloqué).

create extension if not exists pgcrypto;
create schema if not exists kora;

create table if not exists kora.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nom text not null,
  password_hash text not null,
  role text not null default 'invite' check (role in ('admin','invite')),
  created_at timestamptz not null default now()
);

create table if not exists kora.invitations (
  code text primary key,
  created_by uuid not null references kora.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references kora.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists kora.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references kora.users(id) on delete cascade,
  nom text not null,
  appli text not null default 'whatsapp' check (appli in ('sms','whatsapp')),
  mode text not null default 'brouillon' check (mode in ('auto','brouillon','jamais')),
  created_at timestamptz not null default now()
);

create table if not exists kora.messages_traites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references kora.users(id) on delete cascade,
  contact_id uuid references kora.contacts(id) on delete set null,
  contact_nom text not null,
  appli text not null check (appli in ('sms','whatsapp')),
  recu text not null,
  reponse text not null,
  statut text not null default 'envoye' check (statut in ('envoye','brouillon','annule','corrige')),
  created_at timestamptz not null default now()
);

create table if not exists kora.reglages (
  user_id uuid primary key references kora.users(id) on delete cascade,
  theme text not null default 'sombre' check (theme in ('sombre','clair')),
  reponses_auto boolean not null default true,
  pause_jusqua timestamptz,
  -- ordre + activation des fournisseurs IA : [{"id":"groq","actif":true}, ...]
  fournisseurs_ia jsonb not null default '[]',
  garde_fous jsonb not null default '{"jamais_argent":true,"jamais_rdv":true,"confirmation_sensible":true}',
  updated_at timestamptz not null default now()
);

create table if not exists kora.souvenirs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references kora.users(id) on delete cascade,
  contenu text not null,
  categorie text not null default 'général',
  created_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on kora.contacts(user_id);
create index if not exists messages_user_idx on kora.messages_traites(user_id, created_at desc);
create index if not exists souvenirs_user_idx on kora.souvenirs(user_id, created_at desc);

alter table kora.users enable row level security;
alter table kora.invitations enable row level security;
alter table kora.contacts enable row level security;
alter table kora.messages_traites enable row level security;
alter table kora.reglages enable row level security;
alter table kora.souvenirs enable row level security;
