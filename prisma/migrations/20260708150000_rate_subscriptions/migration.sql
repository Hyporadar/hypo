-- CreateEnum
CREATE TYPE "RateAlertFrequency" AS ENUM ('QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL');

-- CreateTable
CREATE TABLE "RateSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'fr',
    "frequency" "RateAlertFrequency" NOT NULL DEFAULT 'HEBDOMADAIRE',
    "lastSentAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateSubscription_email_key" ON "RateSubscription"("email");

-- CreateIndex
CREATE INDEX "RateSubscription_frequency_lastSentAt_idx" ON "RateSubscription"("frequency", "lastSentAt");

