# HypoPilot

Plateforme de surveillance d'hypothèques — fintech suisse. Next.js (App Router) · TypeScript strict · Tailwind 4 · shadcn/ui · next-intl (fr/de/it) · PostgreSQL + Prisma · Auth.js.

Le contexte produit complet est dans [CLAUDE.md](CLAUDE.md). Le design system est dans `.claude/skills/hypopilot-design/`.

## Démarrage

```bash
# 1. Dépendances
pnpm install

# 2. Environnement
cp .env.example .env
# → renseigner DATABASE_URL et AUTH_SECRET (openssl rand -base64 32)

# 3. Base de données (PostgreSQL requis, ex. brew install postgresql@17)
createdb hypopilot
pnpm db:migrate     # applique les migrations
pnpm db:seed        # données de démo (comptes : Password123!)

# 4. Lancer
pnpm dev
```

## Comptes de démo (après seed)

| Rôle    | Email                 | Accès                       |
| ------- | --------------------- | --------------------------- |
| ADMIN   | admin@hypopilot.ch    | /admin (tout)               |
| CLOSER  | closer1@hypopilot.ch  | /admin (sa file de leads)   |
| PARTNER | partner1@hypopilot.ch | /admin (ses leads apportés) |
| CLIENT  | client1@exemple.ch    | /fr/app (espace client)     |

Mot de passe commun : `Password123!`

## Commandes

| Commande          | Effet                                   |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Serveur de développement                |
| `pnpm build`      | Build de production                     |
| `pnpm test`       | Tests Vitest (règles métier finance.ts) |
| `pnpm lint`       | ESLint                                  |
| `pnpm format`     | Prettier                                |
| `pnpm db:migrate` | Migrations Prisma                       |
| `pnpm db:seed`    | Seed de démo                            |
| `pnpm db:studio`  | Prisma Studio                           |

## Architecture

- `src/app/[locale]/` — pages publiques et espace client, trilingues (slugs traduits : `/fr/acheter`, `/de/kaufen`, `/it/comprare`)
- `src/app/admin/` — panel interne (français uniquement), accès CLOSER/PARTNER/ADMIN filtré par rôle
- `src/lib/finance.ts` — **toutes** les règles métier suisses (pur, testé) ; aucun calcul financier ailleurs
- `src/lib/format.ts` — formats suisses (`CHF 1'250'000`, `1,25%`, `JJ.MM.AAAA`)
- `src/proxy.ts` — routing i18n + protection par rôle
- `messages/` — fr.json (source) / de.json / it.json ; aucune chaîne en dur dans les composants
- `prisma/` — schéma, migrations, seed
