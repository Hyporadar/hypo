-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'CLOSER', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('fr', 'de', 'it');

-- CreateEnum
CREATE TYPE "Funnel" AS ENUM ('ACHAT', 'RENOUVELLEMENT_CHAUD', 'RENOUVELLEMENT_FROID');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOUVEAU', 'CONTACTE', 'RDV', 'DOSSIER_EN_COURS', 'DOSSIER_COMPLET', 'ENVOYE_PARTENAIRE', 'OFFRES_RECUES', 'SIGNE', 'PERDU', 'NURTURING');

-- CreateEnum
CREATE TYPE "MortgageType" AS ENUM ('FIXE', 'SARON');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('ABANDON_DOSSIER', 'OFFRES_NON_LUES', 'OFFRE_EXPIRE_BIENTOT', 'ENTREE_FENETRE', 'GROSSE_ECONOMIE', 'CALLBACK_DEMANDE');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('OUVERT', 'TRAITE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('DUE', 'PAYEE');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('APPEL', 'VISIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "funnel" "Funnel" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOUVEAU',
    "score" INTEGER NOT NULL DEFAULT 0,
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "userId" TEXT,
    "partnerId" TEXT,
    "closerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusChange" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mortgage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "currentRate" DECIMAL(6,3) NOT NULL,
    "currentLender" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "MortgageType" NOT NULL,
    "propertyValue" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mortgage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "ownFunds" DECIMAL(12,2) NOT NULL,
    "ownFundsPillar2" DECIMAL(12,2) NOT NULL,
    "annualGrossIncome" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treatedAt" TIMESTAMP(3),

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "termYears" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRate" (
    "id" TEXT NOT NULL,
    "type" "MortgageType" NOT NULL DEFAULT 'FIXE',
    "termYears" INTEGER NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "closerId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_status_funnel_idx" ON "Lead"("status", "funnel");

-- CreateIndex
CREATE INDEX "Lead_closerId_status_idx" ON "Lead"("closerId", "status");

-- CreateIndex
CREATE INDEX "Lead_partnerId_idx" ON "Lead"("partnerId");

-- CreateIndex
CREATE INDEX "LeadStatusChange_leadId_changedAt_idx" ON "LeadStatusChange"("leadId", "changedAt");

-- CreateIndex
CREATE INDEX "Mortgage_endDate_idx" ON "Mortgage"("endDate");

-- CreateIndex
CREATE INDEX "Signal_status_createdAt_idx" ON "Signal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Signal_leadId_idx" ON "Signal"("leadId");

-- CreateIndex
CREATE INDEX "Offer_leadId_status_idx" ON "Offer"("leadId", "status");

-- CreateIndex
CREATE INDEX "Document_leadId_idx" ON "Document"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceRate_type_termYears_key" ON "ReferenceRate"("type", "termYears");

-- CreateIndex
CREATE INDEX "CommissionEntry_beneficiaryId_status_idx" ON "CommissionEntry"("beneficiaryId", "status");

-- CreateIndex
CREATE INDEX "Appointment_closerId_date_idx" ON "Appointment"("closerId", "date");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusChange" ADD CONSTRAINT "LeadStatusChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusChange" ADD CONSTRAINT "LeadStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mortgage" ADD CONSTRAINT "Mortgage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProject" ADD CONSTRAINT "PurchaseProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

