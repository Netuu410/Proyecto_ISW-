ALTER TABLE "Equipo" ADD COLUMN "stockAveriado" INTEGER NOT NULL DEFAULT 0;
-- Antes, mantenimiento bloqueaba todo el registro: conserva esa indisponibilidad.
UPDATE "Equipo" SET "stockAveriado" = "stock" WHERE "estado" = 'Mantenimiento';
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_stockAveriado_check"
  CHECK ("stockAveriado" >= 0 AND "stockAveriado" <= "stock");

-- Los reportes antiguos no registraban cantidad; NULL significa desconocida.
ALTER TABLE "ReporteAveria" ADD COLUMN "cantidad" INTEGER;
ALTER TABLE "ReporteAveria" ADD CONSTRAINT "ReporteAveria_cantidad_check"
  CHECK ("cantidad" IS NULL OR "cantidad" > 0);
