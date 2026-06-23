-- Drop the legacy single `toilet_words` column.
-- It was split into `toilet_word_bowel` / `toilet_word_urination` in Fase 2 · 2D
-- and backfilled (value copied into `toilet_word_urination`). No code references
-- it any more (verified across schema, service, DTO, frontend types + i18n).
ALTER TABLE "child_development" DROP COLUMN "toilet_words";
