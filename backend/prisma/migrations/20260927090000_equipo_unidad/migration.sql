BEGIN;

-- El modelo publicado no tenía migración. También admite una tabla creada
-- previamente con ese esquema (por ejemplo mediante db push), sin recrearla.
CREATE TABLE IF NOT EXISTS "Equipo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "descripcion" TEXT,
    "estado" TEXT DEFAULT 'Disponible',
    "precio" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

LOCK TABLE "Equipo" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "Equipo" ADD COLUMN IF NOT EXISTS "codigo" TEXT;

-- Una fila antigua sigue siendo una unidad. No se modifican ID ni atributos.
-- El bloqueo y la comprobación evitan colisiones durante el backfill.
DO $$
DECLARE
    unidad RECORD;
    nuevo_codigo TEXT;
BEGIN
    FOR unidad IN SELECT "id" FROM "Equipo" WHERE "codigo" IS NULL OR btrim("codigo") = '' LOOP
        LOOP
            nuevo_codigo := 'EQ-' || upper(gen_random_uuid()::text);
            EXIT WHEN NOT EXISTS (SELECT 1 FROM "Equipo" WHERE "codigo" = nuevo_codigo);
        END LOOP;
        UPDATE "Equipo" SET "codigo" = nuevo_codigo WHERE "id" = unidad."id";
    END LOOP;
END $$;

ALTER TABLE "Equipo" ALTER COLUMN "codigo" SET DEFAULT ('EQ-' || upper(gen_random_uuid()::text));
ALTER TABLE "Equipo" ALTER COLUMN "codigo" SET NOT NULL;
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_codigo_no_vacio" CHECK (btrim("codigo") <> '');
CREATE UNIQUE INDEX "Equipo_codigo_key" ON "Equipo"("codigo");

COMMIT;
