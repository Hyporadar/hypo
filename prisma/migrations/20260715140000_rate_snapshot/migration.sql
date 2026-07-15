-- Historique quotidien des taux dérivés des données publiques BNS.
CREATE TABLE "RateSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "saron" DECIMAL(6,3),
    "yields" JSONB NOT NULL,
    "computed" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RateSnapshot_date_key" ON "RateSnapshot"("date");
CREATE INDEX "RateSnapshot_date_idx" ON "RateSnapshot"("date");
