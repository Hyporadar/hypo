# HypoRadar

Plateforme suisse de surveillance d'hypothèques — trilingue fr/de/it.
Next.js (App Router) · TypeScript strict · Tailwind 4 · shadcn/ui · next-intl · PostgreSQL + Prisma · Auth.js · Playwright.

Le contexte produit complet est dans [CLAUDE.md](CLAUDE.md). Le design system est dans `.claude/skills/hypopilot-design/`.

## Lancer en local

```bash
# 1. Dépendances
pnpm install

# 2. Environnement
cp .env.example .env
# → DATABASE_URL (PostgreSQL local) et AUTH_SECRET (openssl rand -base64 32)

# 3. Base de données (PostgreSQL ≥ 15)
createdb hyporadar
pnpm db:migrate        # applique les migrations
pnpm db:seed           # données de démo

# 4. Lancer
pnpm dev               # http://localhost:3000

# 5. Le moteur de signaux (à appeler périodiquement — cron toutes les 15 min en prod)
curl http://localhost:3000/api/cron/signals
```

## Comptes de démo (seed — mot de passe commun `Password123!`)

| Rôle    | Email                 | Ce qu'il voit                                      |
| ------- | --------------------- | -------------------------------------------------- |
| ADMIN   | admin@hyporadar.ch    | /admin : tout (leads, pipeline, stats, taux…)      |
| CLOSER  | closer1@hyporadar.ch  | /admin : SA file de signaux, agenda, mes stats     |
| CLOSER  | closer2@hyporadar.ch  | idem, ses leads à lui                              |
| PARTNER | partner1@hyporadar.ch | /admin : ses apports, envoyer un client, ses gains |
| PARTNER | partner2@hyporadar.ch | idem (code BERNASCONI)                             |
| CLIENT  | client1@exemple.ch    | /fr/app : hypothèque surveillée (fenêtre ouverte)  |
| CLIENT  | client6@exemple.ch    | /de/app : client germanophone, hypothèque froide   |
| CLIENT  | client9@exemple.ch    | /it/app : client italophone                        |

Codes apporteurs seed : `?ref=LAMBERT`, `?ref=BERNASCONI`.

## Commandes

| Commande          | Effet                                           |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Serveur de développement                        |
| `pnpm build`      | Build de production                             |
| `pnpm test`       | Vitest : règles métier + moteur de signaux (36) |
| `pnpm test:e2e`   | Playwright : parcours complets + RBAC (15)      |
| `pnpm lint`       | ESLint                                          |
| `pnpm db:migrate` | Migrations Prisma                               |
| `pnpm db:seed`    | Seed de démo (réinitialise les données)         |
| `pnpm db:studio`  | Prisma Studio                                   |

## Structure du code

- `src/app/[locale]/(marketing)/` — pages publiques trilingues, slugs traduits (`/fr/acheter`, `/de/kaufen`, `/it/comprare`)
- `src/app/[locale]/app/` — espace client (dashboard, dossier, parrainage, compte)
- `src/app/admin/` — panel interne français, un layout, contenu selon le rôle
- `src/app/verify/[id]/` — vérification publique des certificats (QR)
- `src/app/api/cron/signals/` — le job du moteur de signaux (idempotent)
- `src/lib/finance.ts` — **toutes** les règles métier suisses (pur, testé) ; rien ailleurs
- `src/lib/format.ts` — formats suisses (`CHF 1'250'000`, `1,25%`, `JJ.MM.AAAA`)
- `src/server/signals/` — moteur de signaux + nurturing (le cœur du système)
- `src/server/events.ts` — module central des événements clients
- `src/server/actions/` — toutes les server actions (funnels, client, admin, partners)
- `src/components/funnel/` — moteur de formulaire multi-étapes partagé
- `src/content/guides/` — articles MDX (3 guides × 3 langues)
- `messages/` — fr.json (source) / de.json / it.json ; aucune chaîne en dur
- `prisma/` — schéma, migrations, seed
- `e2e/` — tests Playwright (parcours + étanchéité RBAC)

## Changer le thème quand le brandkit évolue

Tout le thème vit dans **`src/app/globals.css`** :

- le bloc `@theme` définit les tokens de marque (couleurs `pilot-*`, `ambre-*`, `ink-*`, `paper`, fonts) ;
- le bloc `:root` mappe les variables sémantiques shadcn (primary, border, ring…) sur cette palette.

Changer ces deux blocs rethème toute l'application d'un coup. Les fonts se changent dans `src/app/fonts.ts`. Deux exceptions à connaître : le PDF du certificat (`src/server/pdf/certificate.ts`, couleurs en constantes) et l'image OG (`src/app/[locale]/opengraph-image.tsx`).

## Ajouter une langue

1. `src/i18n/routing.ts` : ajouter la locale dans `locales` et un slug par entrée de `pathnames`.
2. Créer `messages/<locale>.json` (copier fr.json et traduire — le français fait foi).
3. `prisma/schema.prisma` : ajouter la valeur à l'enum `Locale` + migration.
4. Vérifier `src/lib/lead-status.ts` (statuts client) et les libellés du sélecteur de langue (`locale-switcher.tsx`, `account-form.tsx`).
5. Les emails, PDF et sitemap suivent automatiquement.

## Ce qui est mocké — à brancher pour la prod, par priorité

1. **Emails** (`src/server/email/provider.ts`) — `ConsoleEmailProvider` fait `console.log`. Brancher Resend/Postmark : implémenter `EmailProvider.send()`, tout le nurturing suit. _Bloquant pour le lancement._
2. **Cron** — `/api/cron/signals` doit être appelé périodiquement (Vercel Cron, crontab…). Protéger avec `CRON_SECRET`. _Bloquant : sans lui, pas de réveil froid→chaud ni de nurturing._
3. **Stockage des uploads** (`uploads/` local dans `funnels.ts` et `client.ts`) — brancher S3/R2 avec URLs signées. _Bloquant dès les premiers vrais documents._
4. **Notifications closers** (`src/server/notifications.ts`) — console.log ; brancher e-mail/SMS/push (l'interface est prête). _Important : le SLA < 5 min en dépend._
5. **SMS** — préférence d'alerte présente dans le compte client mais désactivée. _Après lancement._
6. **Taux externes** — la table `ReferenceRate` est saisie par l'admin ; le branchement sur des sources externes est prévu mais non requis. _Après lancement._
7. **Barèmes de commission** — constantes v1 dans `src/server/actions/admin.ts` (500/300/100 CHF) ; à sortir en table gérée par l'admin quand le modèle se précise.
8. **Contenus juridiques** — impressum/LPD/CGU sont des placeholders marqués À VALIDER PAR AVOCAT.
