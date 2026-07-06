# HypoPilot — plateforme web

HypoPilot est une fintech suisse qui surveille **gratuitement** l'hypothèque des propriétaires. Monétisation : commissions des prêteurs, **affichées en toute transparence** (pilier du produit). Derrière la plateforme, des **closers humains rappellent les leads chauds en moins de 5 minutes** — tout le logiciel est construit autour de cette exigence de vitesse.

## Produit & funnels

Trois funnels d'acquisition (concept métier), servis par **deux landings publiques** :

1. **ACHAT** (`/fr/acheter`, `/de/kaufen`, `/it/comprare`) — un acheteur calcule sa capacité d'achat et obtient un **certificat PDF gratuit en 2 minutes**.
2. **RENOUVELLEMENT** (`/fr/renouveler`, `/de/erneuern`, `/it/rinnovare`) — un propriétaire saisit son hypothèque actuelle. Routage automatique selon la date d'échéance :
   - **échéance < 18 mois** → lead **CHAUD** → CTA « lancer l'appel d'offres » ;
   - **échéance ≥ 18 mois** → lead **FROID** → CTA « activer la surveillance gratuite ». La plateforme le réveille 12–18 mois avant l'échéance, où il bascule **automatiquement** en CHAUD ;
   - **échéance < 4 mois** (préavis probablement dépassé) → message honnête « trop tard pour cette fois » + surveillance pour le prochain cycle.

Le service est 100 % gratuit pour l'utilisateur. La transparence sur les rémunérations se dit noir sur blanc dans l'UI.

## Règle d'or produit

Un lead n'est **JAMAIS** transmis brut à un partenaire hypothécaire externe. Le lead appartient à HypoPilot ; seul un **dossier complété et consenti** est marqué « envoyé au partenaire » (champ de statut — aucune intégration externe pour l'instant).

## Stack imposée

- **Next.js (App Router)** + **TypeScript strict** + **Tailwind** + **shadcn/ui** + **next-intl**
- **PostgreSQL** + **Prisma**
- **Auth.js** avec sessions (base de données) et rôles
- **Une seule application** — pas de repo séparé pour l'admin
- Emails via une interface `EmailProvider` **mockée** (`console.log`) — pas de vrai envoi pour l'instant

## Multilinguisme (exigence jour 1)

Trois langues actives : **français (fr, langue source)**, **allemand (de)**, **italien (it)**. Architecture extensible (en plus tard).

- Routing par **préfixe de locale** (`/fr/...`, `/de/...`, `/it/...`) avec **slugs traduits** via la config de routing de next-intl (`pathnames`).
- **AUCUNE chaîne en dur dans les composants** : tout passe par `messages/fr.json` / `de.json` / `it.json`. Le français fait foi. Traductions de/it de qualité professionnelle, registre bancaire suisse : « Hypothek », « ipoteca », vouvoiement **Sie/Lei**.
- **hreflang** + sitemap multilingue + balises canonical correctes.
- Détection de langue au premier visit (`Accept-Language`), bascule manuelle **persistée** (cookie + `User.locale` si connecté).
- Emails, **PDF (certificat)** et statuts affichés au client : dans la langue de l'utilisateur (`User.locale`). Le panel `/admin` reste **français uniquement** (hors routing localisé).

### Formats suisses (dans les trois langues)

- Montants : `CHF 1'250'000` (apostrophe comme séparateur de milliers)
- Dates : `JJ.MM.AAAA`
- Décimales : virgule (`1,25%`)
- Helpers centralisés dans `src/lib/format.ts` — ne jamais formater à la main dans un composant.

## Règles métier suisses — `src/lib/finance.ts` (module unique, testé)

Toute la logique financière vit dans ce seul module, en fonctions pures, couvertes par des tests unitaires. Aucun calcul financier ailleurs.

- **Capacité d'achat (tenue des charges)** : taux théorique **5 %** sur le prêt + amortissement + **1 % du prix** en frais d'entretien ; total **≤ 33 %** du revenu brut annuel du ménage.
- **Amortissement** : dette ramenée à **65 %** de la valeur du bien en **15 ans** (2e rang).
- **Fonds propres** : minimum **20 %** du prix, dont **au moins 10 % hors 2e pilier**.
- **Économie potentielle au renouvellement** = (taux actuel du client − taux de référence du marché) × montant restant. Taux de référence : **table interne gérée par l'admin** (branchable plus tard sur des sources externes). Les taux sont **NATIONAUX** (aucune variation cantonale).
- **Renouvellement** : préavis de résiliation typique **3–6 mois** avant échéance ; fenêtre d'action **12–18 mois** avant.
- Seuils de routage des leads : CHAUD `< 18 mois`, FROID `≥ 18 mois`, trop tard `< 4 mois` — constantes exportées de `finance.ts`, jamais dupliquées.

## Rôles (un seul panel `/admin`, accès selon rôle)

- **CLIENT** : espace client (`/{locale}/app`), dans sa langue.
- **CLOSER** : dans `/admin`, uniquement **sa** file de leads, son agenda, ses stats.
- **PARTNER** (apporteur B2B : agent immobilier, fiduciaire) : dans `/admin`, uniquement **ses** leads apportés et **ses** commissions.
- **ADMIN** : tout, plus gestion des utilisateurs, barèmes, taux de référence.

Le contrôle d'accès se fait **côté serveur** (layout + actions), jamais seulement en masquant l'UI.

## Design & marque

Le brand kit complet est un skill du projet : **`.claude/skills/hypopilot-design/`** (tokens CSS, composants de référence, UI kits website/app/certificat/email, guidelines). Le consulter avant tout travail d'UI. L'essentiel :

- **Couleurs** : papier `#FAF7F1`, encre `#211E1A`, primaire Vert Pilote `#1B6B52` (green-600), foncé `#155843` pour surfaces de marque. **Ambre** (`#D99A33` / `#B97E1E`) réservé aux **alertes utiles** (échéance, fenêtre 12–18 mois) — jamais décoratif, max 1 accent ambre par écran. Erreur `#B0443C`. **Aucun dégradé**, pas de glassmorphism.
- **Typo** : Bricolage Grotesque (titres, 600) / Instrument Sans (corps, UI) / **Spline Sans Mono pour TOUTES les données chiffrées** (taux, montants, dates).
- **Ton** : vouvoiement, phrases courtes, chiffres précis, transparence dite noir sur blanc. Pas d'emoji, pas de point d'exclamation. Sentence case partout (titres et boutons inclus). Boutons = verbe d'action + bénéfice (« Obtenir mon certificat »).
- **Icônes** : Lucide, trait 2px, jamais rempli.
- **Motif signature** : la ligne de temps de l'hypothèque, point ambre sur la fenêtre 12–18 mois.
- Logo : wordmark typographique « HypoPilot » (« Hypo » encre / « Pilot » vert-600), composant `Wordmark` — pas de symbole séparé.

## Conventions de code

- TypeScript **strict**, pas de `any` non justifié.
- Montants en base : **centimes (Int)** ou `Decimal` Prisma — jamais de `Float` pour l'argent. Taux en `Decimal` (points de pourcentage, ex. `1.25`).
- Logique métier dans `src/lib` / `src/server` (services + server actions) ; les composants restent présentiels.
- Tests : Vitest sur `lib/finance.ts` (obligatoire, cas limites inclus) et sur le routage des leads.
- Emails : toute notification passe par l'interface `EmailProvider` (implémentation `ConsoleEmailProvider`) et est journalisée en base (`EmailLog`).
- Le repo remote est `gauthier-koller/hypo` sur GitHub, branche `main`.
