# HypoPilot — Design System & Brand Kit

## Contexte produit

**HypoPilot** est une fintech suisse qui surveille gratuitement l'hypothèque des propriétaires.

- Le client **enregistre son hypothèque en 3 minutes** ; la plateforme suit son taux et sa date d'échéance pendant des années.
- Elle le **prévient 12–18 mois avant l'échéance** — la seule fenêtre où il peut encore changer de banque.
- Elle met ensuite **banques, assurances et caisses de pension en concurrence** pour obtenir le meilleur taux.
- Elle délivre aux acheteurs un **certificat de capacité d'achat** gratuit en 2 minutes — le document exigé pour faire une offre sur un bien.
- **100 % gratuit** pour l'utilisateur, rémunéré par des commissions des prêteurs, **affichées en toute transparence**. La transparence est le premier argument de vente.

**Audience** : propriétaires 35–60 ans (grand public) + jeunes acheteurs 30–45 (digital-first). **Langue** : français. **Personnalité** : fintech moderne et chaleureuse — accessible, humaine, précise. Suissitude discrète (précision, sobriété — pas de croix suisse ni de rouge).

Sources : brief client uniquement (aucun asset fourni). Référence citée : https://www.hypotheke.ch/

## CONTENT FUNDAMENTALS — voix & ton

- **Vouvoiement**, toujours. Chaleureux mais jamais familier.
- **Phrases courtes. Directes.** Une idée par phrase. On parle comme un bon conseiller, pas comme une banque.
- **Chiffres précis, jamais vagues** : « 3 minutes », « 12–18 mois avant l'échéance », « 2 minutes ». Les chiffres sont notre preuve — toujours en `--font-mono` dans l'UI.
- **La transparence se dit, noir sur blanc** : on nomme la commission, on ne la cache pas. Ex. : « Gratuit pour vous. Payé par les prêteurs. Affiché noir sur blanc. »
- **Pas de jargon bancaire** sans explication. « Échéance », « taux », « amortissement » sont OK ; expliquer le reste en une phrase.
- **Pas d'emoji. Pas de point d'exclamation** (rarissime exception : confirmation d'une réussite client).
- Casse : **Sentence case** partout, y compris titres et boutons. Jamais de TOUT MAJUSCULES sauf overlines (12px, letter-spacing 0.08em).
- Boutons : verbe d'action + bénéfice court. « Enregistrer mon hypothèque », « Obtenir mon certificat », « Voir les offres ».

Exemples de copy canonique :
- « Votre hypothèque arrive à échéance dans 14 mois. C'est maintenant que tout se joue. »
- « 3 minutes pour enregistrer. Des années de surveillance. »
- « Gratuit pour vous. Payé par les prêteurs. Affiché noir sur blanc. »
- « Nous touchons une commission de 0,45 % du prêteur retenu. Vous la voyez avant de signer. »

## VISUAL FOUNDATIONS

- **Couleurs** : tonalité chaude. Papier `#FAF7F1`, encre `#211E1A`. Primaire **Vert Pilote** `--green-600 #1B6B52` (confiance + « feu vert ») ; foncé `--green-700` pour surfaces de marque. Accent **Ambre** `--amber-500/600` réservé aux *alertes utiles* (échéance, fenêtre 12–18 mois) — jamais décoratif. Erreur `#B0443C`. Max 1 accent ambre visible par écran.
- **Type** : Bricolage Grotesque (titres, 600) / Instrument Sans (corps, UI) / Spline Sans Mono (taux, montants, dates — TOUTES les données chiffrées). Voir `tokens/typography.css`.
- **Fonds** : aplats unis (papier ou vert-700 pour sections de marque). **Aucun dégradé.** Pas de textures ni motifs.
- **Cartes** : fond blanc, bord `1px var(--line)`, rayon `--radius-md 12px`, ombre `--shadow-card` très douce.
- **Boutons** : pilule (`--radius-pill`), primaire vert-600 → hover vert-700. Press : rien de spécial (pas de shrink).
- **Hover** : assombrissement de fond (150ms ease). Liens : soulignement au hover.
- **Focus** : `box-shadow: var(--focus-ring)` (halo vert-200).
- **Animations** : fondus et translations discrètes 150–250ms ease. Pas de bounce, pas de spring.
- **Bordures** : 1px, `--line` (léger) ou `--line-strong` (inputs).
- **Layout** : conteneur max 1120px, espacement échelle 4/8 (`--space-*`). Aéré — la densité est faible, on respire.
- **Transparence/blur** : overlay de dialog `rgba(33,30,26,0.4)` sans blur. Pas de glassmorphism.
- **Imagerie** : photos chaudes, lumière naturelle, intérieurs suisses réels ; jamais de stock corporate froid. En attendant les vraies photos : placeholders rayés + libellé mono.
- **Motif signature** : la **ligne de temps** (timeline de l'hypothèque, point ambre sur la fenêtre 12–18 mois) — élément graphique récurrent.

## Logo

Wordmark typographique : **HypoPilot** en Bricolage Grotesque 700, « Hypo » encre / « Pilot » vert-600. Voir `assets/logo.html` (spécimen) et le composant `Wordmark`. Sur fond vert-700 : tout en `--text-on-dark`, « Pilot » en vert-200.
Pas de symbole séparé (choix client : wordmark simple). Fichier vectoriel définitif à produire par un designer — le spécimen HTML fait foi pour la construction.

## ICONOGRAPHIE

- **Lucide** (CDN), trait 2px, taille 20/24px, couleur `currentColor`. Style ligne, jamais rempli — cohérent avec le ton précis et léger.
- Icônes récurrentes : `bell` (alerte échéance), `calendar-clock` (échéance), `percent` (taux), `file-check` (certificat), `scale` (mise en concurrence), `eye` (transparence), `home`.
- Pas d'emoji. Pas d'icônes pleines/duotone. Pas de SVG dessinés à la main.
- Usage React : `<i data-lucide="bell">` + script CDN, ou copies SVG statiques si besoin offline.

## Utilisation avec Claude Code

Ce dossier est un **skill Claude Code** : dézippez-le dans `.claude/skills/hypopilot-design/` de votre projet (ou passez le dossier à Claude Code). `SKILL.md` est le point d'entrée ; il renvoie vers ce README, les tokens CSS, les composants React et les UI kits. Les fichiers HTML sont des **références de design** — à recréer dans votre stack, pas à copier tels quels.

## Index

- `styles.css` → importe `tokens/` (fonts, colors, typography, spacing, effects)
- `guidelines/` → cartes spécimens (couleurs, type, espacement, logo, voix)
- `components/forms/` → Button, IconButton, Input, Select, Checkbox, Radio, Switch
- `components/display/` → Card, Badge, Tag, Wordmark
- `components/feedback/` → Dialog, Toast, Tooltip
- `components/navigation/` → Tabs
- `ui_kits/website/` → site marketing (landing)
- `ui_kits/app/` → app de suivi (tableau de bord hypothèque)
- `ui_kits/certificat/` → certificat de capacité d'achat
- `ui_kits/email/` → email d'alerte échéance
- `SKILL.md` → skill Claude Code

### Ajouts intentionnels
Aucune source de composants fournie → set standard créé de zéro, dimensionné aux besoins (formulaire d'enregistrement, alertes, comparaison d'offres). `Wordmark` ajouté car le logo est typographique et doit rester exact.
