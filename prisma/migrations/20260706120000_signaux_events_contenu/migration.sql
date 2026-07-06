-- CreateEnum
CREATE TYPE "ClientEventType" AS ENUM ('CONNEXION', 'OFFRE_OUVERTE', 'SIMULATION_REVUE', 'DOSSIER_MIS_A_JOUR', 'CERTIFICAT_TELECHARGE');

-- CreateEnum
CREATE TYPE "CommissionKind" AS ENUM ('APPORT_PARTENAIRE', 'VARIABLE_CLOSER', 'PARRAINAGE');

-- DropIndex
DROP INDEX "Signal_leadId_idx";

-- DropIndex
DROP INDEX "Signal_status_createdAt_idx";

-- AlterTable
ALTER TABLE "CommissionEntry" ADD COLUMN     "kind" "CommissionKind" NOT NULL DEFAULT 'APPORT_PARTENAIRE';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sponsorId" TEXT;

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN     "claimedById" TEXT,
ADD COLUMN     "context" JSONB,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alertPrefs" JSONB,
ADD COLUMN     "partnerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "ClientEvent" (
    "id" TEXT NOT NULL,
    "type" "ClientEventType" NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRateChange" (
    "id" TEXT NOT NULL,
    "type" "MortgageType" NOT NULL,
    "termYears" INTEGER NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceRateChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSpend" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ChannelSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "leadId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientEvent_leadId_type_createdAt_idx" ON "ClientEvent"("leadId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ClientEvent_userId_createdAt_idx" ON "ClientEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferenceRateChange_type_termYears_recordedAt_idx" ON "ReferenceRateChange"("type", "termYears", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelSpend_channel_month_key" ON "ChannelSpend"("channel", "month");

-- CreateIndex
CREATE INDEX "EmailLog_leadId_template_idx" ON "EmailLog"("leadId", "template");

-- CreateIndex
CREATE INDEX "Signal_status_priority_idx" ON "Signal"("status", "priority");

-- CreateIndex
CREATE INDEX "Signal_leadId_type_status_idx" ON "Signal"("leadId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEvent" ADD CONSTRAINT "ClientEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEvent" ADD CONSTRAINT "ClientEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

