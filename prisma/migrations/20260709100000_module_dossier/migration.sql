-- CreateEnum
CREATE TYPE "VersionAuthor" AS ENUM ('LEAD', 'CLOSER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UsageBien" AS ENUM ('RESIDENCE_PRINCIPALE', 'RESIDENCE_SECONDAIRE', 'RENDEMENT');

-- CreateEnum
CREATE TYPE "TypeBien" AS ENUM ('MAISON', 'APPARTEMENT_PPE', 'MAISON_MITOYENNE', 'IMMEUBLE');

-- CreateEnum
CREATE TYPE "PositionMaison" AS ENUM ('INDIVIDUELLE', 'JUMELEE', 'MITOYENNE_CENTRALE', 'MITOYENNE_ANGLE');

-- CreateEnum
CREATE TYPE "ProduitTranche" AS ENUM ('FIXE', 'SARON', 'VARIABLE');

-- CreateEnum
CREATE TYPE "StatutActivite" AS ENUM ('SALARIE', 'INDEPENDANT', 'RETRAITE', 'SANS_ACTIVITE');

-- CreateEnum
CREATE TYPE "TypeRevenu" AS ENUM ('SALAIRE', 'BONUS', 'INDEPENDANT', 'RENTE', 'REVENU_LOCATIF', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeCharge" AS ENUM ('LEASING', 'CREDIT', 'PENSION_ALIMENTAIRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeAvoir" AS ENUM ('COMPTE_EPARGNE', 'TITRES', 'PILIER_3A', 'LIBRE_PASSAGE', 'CAPITAL_LPP', 'DONATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeLender" AS ENUM ('BANQUE', 'ASSURANCE', 'CAISSE_PENSION');

-- CreateEnum
CREATE TYPE "DossierEventType" AS ENUM ('WIZARD_STEP_COMPLETED', 'WIZARD_ABANDONED', 'COMPLEX_CASE_DETECTED', 'RATE_ALERT_SUBSCRIBED', 'OFFERS_VIEWED', 'ACCOUNT_CREATED', 'VERSION_CREATED', 'CONSULTATION');

-- AlterTable
ALTER TABLE "RateSubscription" ADD COLUMN     "confirmToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "dossierId" TEXT,
ADD COLUMN     "unsubscribeToken" TEXT;
-- Backfill des lignes existantes avant le NOT NULL (le cuid() par défaut est côté client)
UPDATE "RateSubscription" SET "unsubscribeToken" = md5(random()::text || id) WHERE "unsubscribeToken" IS NULL;
ALTER TABLE "RateSubscription" ALTER COLUMN "unsubscribeToken" SET NOT NULL;

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "funnel" "Funnel" NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "leadId" TEXT,
    "userId" TEXT,
    "complex" BOOLEAN NOT NULL DEFAULT false,
    "complexReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentVersionId" TEXT,
    "completude" INTEGER NOT NULL DEFAULT 0,
    "echeanceProche" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierVersion" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "authorType" "VersionAuthor" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "commentaire" TEXT,
    "parentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bien" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "usage" "UsageBien",
    "type" "TypeBien",
    "position" "PositionMaison",
    "rue" TEXT,
    "npa" TEXT,
    "localite" TEXT,
    "canton" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "geoConfirme" BOOLEAN NOT NULL DEFAULT false,
    "anneeConstruction" INTEGER,
    "anneeRenovation" INTEGER,
    "pieces" DECIMAL(4,1),
    "sallesEau" JSONB,
    "surfaceHabitable" INTEGER,
    "chauffage" TEXT,
    "labelEco" TEXT,
    "etatCuisine" INTEGER,
    "etatSallesBains" INTEGER,
    "etatInterieur" INTEGER,
    "etatExterieur" INTEGER,
    "servitudes" BOOLEAN,
    "zoneAgricole" BOOLEAN,
    "nouvelleConstruction" BOOLEAN,
    "valeur" DECIMAL(12,2),
    "prixAchat" DECIMAL(12,2),
    "fondsPropres" DECIMAL(12,2),

    CONSTRAINT "Bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrancheExistante" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "lenderId" TEXT,
    "lenderNom" TEXT,
    "montant" DECIMAL(12,2) NOT NULL,
    "taux" DECIMAL(6,3),
    "produit" "ProduitTranche" NOT NULL DEFAULT 'FIXE',
    "echeance" TIMESTAMP(3),

    CONSTRAINT "TrancheExistante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrancheSouhaitee" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "produit" "ProduitTranche" NOT NULL DEFAULT 'FIXE',
    "dureeAnnees" INTEGER,
    "montant" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "TrancheSouhaitee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emprunteur" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "anneeNaissance" INTEGER,
    "etatCivil" TEXT,
    "nationalite" TEXT,
    "permis" TEXT,
    "statutActivite" "StatutActivite",
    "dureeActiviteRestanteMois" INTEGER,
    "employeur" TEXT,

    CONSTRAINT "Emprunteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revenu" (
    "id" TEXT NOT NULL,
    "emprunteurId" TEXT NOT NULL,
    "type" "TypeRevenu" NOT NULL,
    "montantAnnuel" DECIMAL(12,2) NOT NULL,
    "libelle" TEXT,

    CONSTRAINT "Revenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "emprunteurId" TEXT NOT NULL,
    "type" "TypeCharge" NOT NULL,
    "montantAnnuel" DECIMAL(12,2) NOT NULL,
    "echeanceLeasing" TIMESTAMP(3),

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avoir" (
    "id" TEXT NOT NULL,
    "emprunteurId" TEXT NOT NULL,
    "type" "TypeAvoir" NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "utilisePourAchat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Avoir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poursuite" (
    "id" TEXT NOT NULL,
    "emprunteurId" TEXT NOT NULL,
    "soldee" BOOLEAN NOT NULL,
    "montant" DECIMAL(12,2),
    "motif" TEXT,

    CONSTRAINT "Poursuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutreBien" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" TEXT,
    "valeur" DECIMAL(12,2),
    "hypothequeRestante" DECIMAL(12,2),
    "revenuLocatifAnnuel" DECIMAL(12,2),

    CONSTRAINT "AutreBien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomCourt" TEXT NOT NULL,
    "alias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "TypeLender" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwissLocality" (
    "id" TEXT NOT NULL,
    "npa" TEXT NOT NULL,
    "localite" TEXT NOT NULL,
    "canton" TEXT NOT NULL,

    CONSTRAINT "SwissLocality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierEvent" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "DossierEventType" NOT NULL,
    "data" JSONB,
    "actorType" "VersionAuthor",
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dossierId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_leadId_key" ON "Dossier"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_currentVersionId_key" ON "Dossier"("currentVersionId");

-- CreateIndex
CREATE INDEX "Dossier_echeanceProche_idx" ON "Dossier"("echeanceProche");

-- CreateIndex
CREATE INDEX "Dossier_completude_idx" ON "Dossier"("completude");

-- CreateIndex
CREATE INDEX "DossierVersion_dossierId_createdAt_idx" ON "DossierVersion"("dossierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DossierVersion_dossierId_numero_key" ON "DossierVersion"("dossierId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Bien_dossierId_key" ON "Bien"("dossierId");

-- CreateIndex
CREATE INDEX "TrancheExistante_dossierId_ordre_idx" ON "TrancheExistante"("dossierId", "ordre");

-- CreateIndex
CREATE INDEX "TrancheSouhaitee_dossierId_ordre_idx" ON "TrancheSouhaitee"("dossierId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Emprunteur_dossierId_ordre_key" ON "Emprunteur"("dossierId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Lender_nom_key" ON "Lender"("nom");

-- CreateIndex
CREATE INDEX "SwissLocality_npa_idx" ON "SwissLocality"("npa");

-- CreateIndex
CREATE INDEX "SwissLocality_localite_idx" ON "SwissLocality"("localite");

-- CreateIndex
CREATE UNIQUE INDEX "SwissLocality_npa_localite_key" ON "SwissLocality"("npa", "localite");

-- CreateIndex
CREATE INDEX "DossierEvent_dossierId_createdAt_idx" ON "DossierEvent"("dossierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RateSubscription_confirmToken_key" ON "RateSubscription"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "RateSubscription_unsubscribeToken_key" ON "RateSubscription"("unsubscribeToken");

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierVersion" ADD CONSTRAINT "DossierVersion_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrancheExistante" ADD CONSTRAINT "TrancheExistante_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrancheExistante" ADD CONSTRAINT "TrancheExistante_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrancheSouhaitee" ADD CONSTRAINT "TrancheSouhaitee_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprunteur" ADD CONSTRAINT "Emprunteur_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenu" ADD CONSTRAINT "Revenu_emprunteurId_fkey" FOREIGN KEY ("emprunteurId") REFERENCES "Emprunteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_emprunteurId_fkey" FOREIGN KEY ("emprunteurId") REFERENCES "Emprunteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avoir" ADD CONSTRAINT "Avoir_emprunteurId_fkey" FOREIGN KEY ("emprunteurId") REFERENCES "Emprunteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poursuite" ADD CONSTRAINT "Poursuite_emprunteurId_fkey" FOREIGN KEY ("emprunteurId") REFERENCES "Emprunteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutreBien" ADD CONSTRAINT "AutreBien_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierEvent" ADD CONSTRAINT "DossierEvent_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

