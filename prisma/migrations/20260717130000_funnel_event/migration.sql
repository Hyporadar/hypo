-- Journal d'événements anonymes de l'entonnoir de conversion
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FunnelEvent_sessionId_step_key" ON "FunnelEvent"("sessionId", "step");
CREATE INDEX "FunnelEvent_step_createdAt_idx" ON "FunnelEvent"("step", "createdAt");
