-- Recherche de localités insensible aux accents : colonne normalisée + index.
ALTER TABLE "SwissLocality" ADD COLUMN "recherche" TEXT NOT NULL DEFAULT '';
CREATE INDEX "SwissLocality_recherche_idx" ON "SwissLocality"("recherche");
