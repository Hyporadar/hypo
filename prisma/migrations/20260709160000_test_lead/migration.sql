-- Site de test (campagne) : capture des formulaires soumis.
CREATE TABLE "TestLead" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "funnel" TEXT NOT NULL,
    "completude" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "callbackDate" TEXT,
    "callbackSlot" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    CONSTRAINT "TestLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TestLead_dossierId_key" ON "TestLead"("dossierId");
CREATE INDEX "TestLead_createdAt_idx" ON "TestLead"("createdAt");
