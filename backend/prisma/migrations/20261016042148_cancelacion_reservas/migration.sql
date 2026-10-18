BEGIN;

-- Datos del historial de cancelación.
ALTER TABLE "ActividadAgenda"
ADD COLUMN "canceladaAt" TIMESTAMPTZ(3),
ADD COLUMN "comprobanteContenido" BYTEA,
ADD COLUMN "comprobanteNombre" TEXT,
ADD COLUMN "comprobanteTipo" TEXT,
ADD COLUMN "detalleCancelacion" JSONB,
ADD COLUMN "motivoCancelacion" TEXT;

-- Las actividades canceladas dejan de bloquear el recinto.
ALTER TABLE "ActividadAgenda"
DROP CONSTRAINT "ActividadAgenda_recinto_sin_traslapes",
ADD CONSTRAINT "ActividadAgenda_recinto_sin_traslapes"
EXCLUDE USING gist (
  "recintoId" WITH =,
  tstzrange("inicio", "fin", '[)') WITH &&
)
WHERE ("estado" <> 'Cancelado');

COMMIT;