# Formulaire app.hypotheke.ch — Inventaire EXHAUSTIF (toutes options et sous-options)

*Relevé en direct les 08-09.07.2026, toutes les branches cliquées une par une (parcours renouvellement, parcours achat, évaluation immobilière, tous les « Oui »). Ce document est la référence unique pour le build HypoRadar — le prompt Claude Code du doc « Formulaire-Hypotheke-Inventaire » reste valable, ce fichier fait foi pour la liste des champs.*

---

## 0. ÉCRAN D'ENTRÉE

- « Comment pouvons-nous vous aider ? »
  - Remplacement d'hypothèque existante (renouvellement)
  - Nouvelle hypothèque (achat)
- « Déjà saisi vos données ? » → Login (reprise du dossier)
- Écran intermédiaire : vidéo « comment obtenir le meilleur taux » + « C'est parti »
- Langues : DE | EN (EN traduit automatiquement, avec avertissement)

## 1. SECTION « BIEN » (Property / Liegenschaft)

### 1.1 Données du bien (modal « Edit property »)

- **Usage du bien**
  - Résidence principale (occupée par le propriétaire)
  - Bien de vacances
    - → sous-question « Occupation ou location ? »
      - Entièrement occupé par le propriétaire
      - Loué et occupé par le propriétaire
      - Entièrement loué
  - Bien loué (rendement)
    - → sous-question « Comment le bien loué est-il utilisé ? »
      - Purement résidentiel
      - Résidentiel et commercial (usage mixte)
      - Purement commercial (bureaux, dépôts, etc.)
    - → sous-question « Type de location ? »
      - Même locataire toute l'année (bail permanent — cas normal)
      - Locataires différents (location temporaire)
    - → **Revenu locatif** : CHF net/an (hors charges)
  - Loué + partiellement habité
- **Type de bien** (si usage résidentiel)
  - Maison individuelle
    - → sous-question « Appartement annexe ? (Einliegerwohnung) » Non / Oui
      - si Oui → « L'appartement annexe est-il loué ? » Non / Oui
        - si Oui → **Revenu locatif de l'appartement annexe** : CHF net/an
  - Appartement (PPE / propriété par étages)
  - Maison mitoyenne
- **Type de bien** (si usage loué — liste étendue)
  - Maison individuelle · Appartement · Maison mitoyenne
  - Plusieurs appartements dans un immeuble
  - Grand ensemble (immeuble de rapport)
- **NPA / localité** : champ autocomplete (« 1003 » → « VD-1003 Lausanne »)
- **Standard écologique** : Non · Minergie · GEAK/CECB · SNBS · Autre standard
- **Chauffage** : Mazout · Gaz · Pompe à chaleur (air-eau ou géothermie) · Chauffage à distance · Bois (copeaux/pellets/bûches) · Électrique/à accumulation · Autre/inconnu
- **Cas spéciaux** (4 × Non/Oui — un Oui ne déclenche PAS de sous-question, il tague simplement le dossier)
  - Droit d'habitation ?
  - Usufruit ?
  - Droit de superficie ?
  - Zone agricole (hors zone à bâtir) ?
- **Note affichée** : biens avec inscriptions au RF (droit de préemption...) pas toujours intermédiables ; crédit de construction → contact direct
- Bouton **Apply**

### 1.2 SPÉCIFIQUE ACHAT — « Informations sur l'achat » (dans le même modal)

- Le bien est-il **existant ou une nouvelle construction ?**
  - Bien existant
  - Nouvelle construction (→ route probablement vers le contact direct, cf. note construction)
- **Prix d'achat** : CHF
- **La date d'achat est-elle déjà fixée ?** (= date d'inscription au registre foncier) Non / Oui
  - si Oui → **Date d'achat** : JJ.MM.AAAA
- **Le bien sera-t-il rénové/agrandi immédiatement après l'achat ?** Non / Oui

### 1.3 Valeur du bien (carte « Enter property value »)

- Deux chemins :
  - **Indiquer la valeur** (modal « Own estimate »)
    - Valeur du bien : CHF
    - **Source de l'estimation** : Banque · Estimation en ligne · Agent immobilier · Expert accrédité · Autre/propre estimation
  - **Faire une évaluation en ligne** (« Performing a real estate appraisal ») → wizard 5 étapes (voir section 5)

### 1.4 RENOUVELLEMENT — Hypothèques existantes (carte « Existing mortgages », répétable)

- **Prêteur actuel** : autocomplete sur base des prêteurs suisses
- **Modèle de la tranche** : SARON · Variable · Taux fixe
- **Date d'échéance** : JJ.MM.AAAA (« tranches à échéances différentes = saisies séparément »)
- **Montant** : CHF
- Boutons : Terminé · **+ Autre hypothèque** (multi-tranches)

### 1.5 ACHAT — Autres prêts

- **« Y a-t-il d'autres prêts liés au bien ? »** (uniquement des prêts servant à financer le bien, p.ex. prêt privé/vendeur) Non / Oui (→ saisie)

### 1.6 Autres biens en propriété (« Other properties »)

- **« Un des emprunteurs possède-t-il d'autres biens ? »** Non / Oui
  - si Oui → modal « Further property » (répétable) :
    - **Quel type de bien ?**
      - Bien occupé par le propriétaire
      - Bien de vacances (usage propre)
      - Bien loué (investissement)
      - Partiellement loué (possédé et loué)
    - (si loué) **Type** : Purement résidentiel · Résidentiel et commercial (mixte) · Purement commercial (bureaux, dépôts)
    - **Le bien est-il situé en Suisse ?** Non / Oui
    - **Genre d'objet** : Maison · Appartement · Maison mitoyenne · Immeuble · Plusieurs appartements
    - **Appartement annexe ?** Non / Oui
    - **Valeur actuelle estimée** : CHF
    - **Hypothèques/prêts sur ce bien ?** Non / Oui
      - si Oui → **Total des hypothèques et prêts** : CHF
      - → **Doivent-ils être amortis ?** (remboursements contractuels) Non / Oui
        - si Oui → **Montant d'amortissement annuel** : CHF/an
    - **Revenu locatif** : CHF net/an
    - Boutons : Terminé · + Autre bien

## 2. SECTION « EMPRUNTEUR » (Borrower / Kreditnehmer)

### 2.0 Nombre

- **« Qui sera emprunteur ? »** Une personne · Deux personnes ou plus (« tous les emprunteurs doivent être saisis, même sans revenu ») → boucle par personne

### 2.1 Données personnelles (modal, par personne)

- **Nationalité** : Suisse · Autre nationalité · Plusieurs nationalités
  - si Autre/Plusieurs → **Permis d'établissement** : C · B · Autre
  - si Autre/Plusieurs → **« La personne est-elle citoyenne US ou a-t-elle un lien fiscal avec les USA ? »** (FATCA) Non / Oui
  - (ces 2 questions n'apparaissent PAS pour nationalité suisse)
- **Résidence future** : Habitera le bien · À l'avenir à une autre adresse
- **Année de naissance** : AAAA (icône bouclier « donnée protégée », format contrôlé)

### 2.2 Revenus (carte + modal « Enter source of income », répétable par personne)

- **« L'emprunteur a-t-il un revenu ? »** Non / Oui
- **Type de revenu**
  - **Revenu d'activité (Earned income)**
    - → **Type d'acquisition** : Salarié · Indépendant · Activité accessoire · Indemnités chômage · Revenu étranger
    - si Salarié →
      - **Revenu annuel brut** : CHF (« 13e salaire inclus, bonus irréguliers exclus »)
      - **« Bonus au cours des 3 dernières années ? »** Non / Oui (→ saisie des montants)
    - si Indépendant →
      - **Revenu annuel** : CHF (« estimez si nécessaire »)
      - **« Depuis quand êtes-vous indépendant ? »** Plus de 3 ans · Moins de 3 ans
        - si Moins de 3 ans → **curseur « l'activité dure depuis moins de... »** : 3 mois · 6 mois · 1 an · 2 ans · 3 ans
  - **Revenu de rente (Pension income)**
    - → **Type de rente** : AI/AVS 1er ou 2e pilier · AI 3e pilier (3a ou 3b) · Rente de survivant (veuve/veuf/orphelin) · Rente d'enfant (AI ou retraite) · Rente viagère / temporaire · Rente étrangère
  - **Autre revenu (Other income)**
    - → **Type** : Pension alimentaire · Revenus de dividendes (participation) · Revenu locatif
- Boutons : Terminé · + Autre revenu
- **Total des revenus/an** affiché en continu

### 2.3 Avoirs (« Do you own any other assets? »)

- Texte : « comptes, pilier 3a, titres... Les avoirs influencent les taux offerts par certains prêteurs. »
- Oui / Non
  - si Oui → modal « Enter assets » (répétable) :
    - **Catégorie d'avoirs**
      - Avoirs en banque
        - → **Type** : Solde de compte · Titres · Compte pilier 3a (sans titres) · Compte-titres pilier 3a · Avoirs de libre passage (compte ou titres)
        - → **Montant** : CHF
      - Avoirs auprès d'une assurance
      - Avoir auprès d'une caisse de pension
      - Autres avoirs
    - Boutons : Terminé · + Autres avoirs
- **Nudge chatbot** : « Pas de caisse de pension ? Saisissez votre capital LPP — ça peut améliorer votre taux ! »

### 2.4 Charges régulières

- **« Leasing, pensions alimentaires, intérêts de prêts/petits crédits — des dépenses régulières ? »** Non / Oui
  - si Oui → modal « Enter regular expenses » (répétable) :
    - **Type de charge** (« les autres dépenses ne doivent PAS être saisies ») : Pensions alimentaires · Mensualités de leasing · Crédit à la consommation (mensualités) · Intérêts et remboursement de prêt
    - **Montant** : CHF/an
    - (leasing) **« Jusqu'à quand court le leasing ? »** curseur : 2026 · 2027 · 2028 · 2029 · 2030 · échéance ultérieure
    - Boutons : Terminé · + Autres charges

### 2.5 Poursuites

- **« La personne a-t-elle des poursuites ouvertes ou terminées ? »** (« beaucoup de prêteurs vérifient avec un extrait des poursuites actuel ») Non / Oui
  - si Oui → modal « Enter debt collection » (répétable) :
    - **Origine / qui a initié la poursuite ?** : Administration fiscale · Dettes de jeu · Mensualités de leasing · Intérêts de prêts · Autre
    - **Montant de la poursuite** : CHF (« selon l'extrait »)
    - **« La poursuite est-elle déjà soldée ? »** (« l'extrait fait foi ») Non / Oui
    - Boutons : Terminé · + Autre poursuite

### 2.6 Autres emprunteurs

- **« Y a-t-il d'autres emprunteurs ? »** Non / Oui (→ boucle personne suivante, mêmes questions)

## 3. SECTION « HYPOTHÈQUE » (Configurator)

### 3.1 RENOUVELLEMENT — par tranche existante (modal « Adjust mortgage »)

- **« Augmenter ou réduire l'hypothèque existante ? »** Pas d'ajustement · Réduire (amortissement unique) · Augmenter
- **« Que voulez-vous changer ? »** (menu d'édition d'une tranche)
  - Changer le modèle d'hypothèque
    - → **Modèle pour cette tranche** : SARON · Variable · Taux fixe
    - → (si fixe) **Durée** : grille 1 à 20 ans
  - Réduire l'hypothèque
    - → **Montant du remboursement** : CHF
  - Augmenter l'hypothèque
    - → **Montant de l'augmentation** : CHF
    - → **Raison de l'augmentation** : Rénovation · Agrandissement · Rénovation et agrandissement · Autre raison
  - Splitter l'hypothèque
    - → **Montant de la nouvelle tranche** : CHF
    - → **Modèle de la nouvelle tranche** : SARON · Variable · Taux fixe (+ durée si fixe)
- Boutons : Apply · Discard
- Affichage : tranches (durée, montant, date de départ = échéance de l'ancienne) + total, bouton + pour tranche supplémentaire

### 3.2 ACHAT — configurateur

- **Slider visuel** entre « Nouvelle hypothèque » (CHF) et « Fonds propres » (CHF) sur le prix d'achat — poignée « déterminez vos fonds propres » ; les deux champs sont aussi éditables directement
- **« Choisir l'hypothèque »** (pencil) → mêmes options modèle/durée/split que 3.1
- (la composition des fonds propres — cash/2e pilier/3a — n'est PAS demandée à ce stade ; elle vient après la création de compte / dans le traitement du dossier)

## 4. SECTION « OFFRE » (Offer)

- Panneau visible dès le début du dossier : « **4. Offre — basée sur des informations incomplètes ⚠** » avec les meilleurs taux du moment (SARON marge, fixe 3/5/7/10 ans...) — s'affine à chaque réponse
- Écran final « **18 offres pour vous** » :
  - Sélecteur à gauche : SARON (marge) · 5 ans · 10 ans · 15 ans (+ durées configurées) → **les offres à droite se recalculent selon la durée sélectionnée**
  - Offres **anonymisées par type de prêteur** : « Caisse de pension ★5 (39) », « Assurance ★4,8 (69) »... avec taux, **Sparpotential CHF**, arguments qualitatifs (« pas d'ouverture de compte nécessaire », « reprise des frais de cédules », « résiliation anticipée d'un fixe gratuite »)
  - Boutons « Abschliessen » (conclure) + « Angebote individualisieren » + « 15 autres offres »
  - **Identité du prêteur révélée seulement après création de compte** (« Save dossier » = le gate)
  - Option « **S'abonner au Zins-Update** » (mise à jour des taux personnalisée)

## 5. WIZARD D'ÉVALUATION IMMOBILIÈRE (« real estate appraisal », 5 étapes avec icônes de progression)

- **Étape 1 — Adresse** (icône localisation)
  - Rue et numéro (NPA/localité repris) → « Vérifier l'adresse » → **carte swisstopo avec pin** à confirmer → Next
- **Étape 2 — Terrain & bâtiment** (icône arbre)
  - **Type de maison** : Individuelle (freestanding) · Jumelée (semi-detached) · Mitoyenne centrale (mid-terrace) · Mitoyenne d'angle (terraced corner)
  - **Surface du terrain** : m² (parcelle)
  - **Volume / cubature** : m³ (« reprenez la cubature de l'attestation d'assurance bâtiment »)
  - **Année de construction** : AAAA
- **Étape 3 — Aménagement** (icône bâtiment, hash #Ausbau)
  - **Surface habitable nette** : m² (« si vous ne connaissez que la brute : ×0,9 ; vérifiez sur les plans »)
  - **Nombre de pièces** : compteur +/−
  - **Comment les pièces sont comptées** : Cuisine non comptée · Cuisine = ½ pièce · Cuisine = 1 pièce
  - **Salles d'eau** (3 compteurs +/−) : Salle de bain avec WC · WC séparés · Douches séparées (définition affichée : WC+lavabo+douche/baignoire = salle de bain ; WC sans douche = WC séparé)
  - **Les combles sont-ils aménagés ?** Non · Oui · Pas possible
  - **Extérieur : « Le bien a-t-il des places de parc ? »** (garage, carport, places — pas publiques) Non / Oui (→ compteurs par type)
- **Étape 4 — État** (icône loupe, hash #Zustand) — 4 curseurs Très bon · Bon · Moyen · Mauvais (7 crans)
  - **Plan / disposition des pièces** (répond-il aux exigences actuelles ?)
  - **Équipement de la maison** (cuisine, salles de bain, chauffage vs standard actuel)
  - **Qualité de construction / structure** (matériaux, isolation thermique et phonique, vitrage, toiture — la qualité, pas l'état)
  - **État général du bâtiment** (substance + défauts visibles = besoin de rénovation)
  - **« La maison a-t-elle été largement rénovée ? »** (travaux ≥ 20% de la valeur d'assurance bâtiment) Non / Oui
    - si Oui → **Année de la rénovation** : AAAA
- **Étape 5 — Résultat** (icône calculatrice) : valeur estimée gratuite injectée dans le dossier

## 6. ASSISTANT DIGITAL « H7PO » (panneau latéral, ouvert via la mascotte)

- **Progression** : donut % (« Capture 71% — saisissez les détails du bien... ») + **estimation du temps restant** (« si vous continuez ainsi : ~8 minutes »)
- **Interest rate cockpit** : détails et vue d'ensemble de l'offre de taux personnelle
- **Tips & ideas** (avec badge « New ») : suggestions d'optimisation contextuelles — ex. constaté : « Saisissez votre capital de caisse de pension : il améliore votre situation financière et peut mener à de meilleurs taux » (déclenché parce qu'un revenu salarié LPP a été saisi sans capital LPP)
- **Help & Contact**

## 7. MENU / DIVERS

- Menu burger : Changer de langue · **Sauvegarder le dossier** (= création de compte) · Propriétés · **Changer le type de transaction** (achat ↔ renouvellement, avec avertissement « les infos déjà saisies devront être complétées ou ressaisies ») · Vue imprimable · Signaler un problème · Impressum · CGU
- Navigation bas de page : ← retour · icône profil (login/compte) · → suivant · ⚠ triangle « informations manquantes » (liste les questions oubliées par section)
- Toutes les questions ont une icône ⓘ (explication) ; certaines ont une icône 🛡 (donnée protégée) ou 📍 (donnée liée au lieu)
- Validation inline : « Information required » sous le champ manquant ; barre de statut par carte (verte OK / orange manquant)

---

## Compléments à intégrer au prompt Claude Code (par rapport à la v1)

1. Branches locatives complètes (usage vacances/loué + revenus locatifs, granny flat loué) — enums ci-dessus.
2. Autres biens : mini-formulaire répétable complet (type, usage, Suisse ?, valeur, dette, amortissement, loyer).
3. Permis B/C/Autre + question FATCA pour non-Suisses (confirmé — c'était une hypothèse).
4. Revenus : les 3 types avec toutes les sous-listes (5 types d'activité, 6 types de rente, 3 autres revenus, règle indépendant <3 ans avec curseur).
5. Avoirs : 4 catégories, 5 types bancaires (dont 3a compte/titres et libre passage — données précieuses pour notre cross-sell 3a !).
6. Charges : 4 types + échéance de leasing.
7. Poursuites : 5 origines + montant + soldée ou non (répétable).
8. Configurateur : les 4 actions par tranche (changer modèle / réduire / augmenter+raison / splitter).
9. Achat : slider fonds propres ↔ hypothèque, prix, date RF, rénovation immédiate, autres prêts.
10. Évaluation hédoniste : wizard 5 étapes complet (à brancher sur un service type IAZI/Wüest ou PriceHubble en année 2 ; année 1 = champ valeur + source, comme prévu).
11. Assistant : jauge de progression + estimation de temps restant + tips contextuels (le tip LPP = exactement notre nudge 3a/LPP).
