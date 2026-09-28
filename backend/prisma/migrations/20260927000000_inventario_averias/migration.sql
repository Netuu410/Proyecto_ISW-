-- Equipo ya figuraba en schema.prisma, pero no en el historial de migraciones.
-- IF NOT EXISTS conserva instalaciones que lo crearon mediante db push.
CREATE TABLE IF NOT EXISTS "Equipo" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "imagenUrl" TEXT,
  "descripcion" TEXT,
  "estado" TEXT DEFAULT 'Disponible',
  "precio" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Equipo" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Equipo" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'Propio';
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_stock_check" CHECK ("stock" >= 1);
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_origen_check" CHECK ("origen" IN ('Propio', 'Arrendado'));

CREATE TABLE "ReporteAveria" (
  "id" SERIAL PRIMARY KEY,
  "equipoId" INTEGER NOT NULL REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "descripcion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AlertaStock" (
  "id" SERIAL PRIMARY KEY,
  "equipoId" INTEGER NOT NULL REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reporteId" INTEGER NOT NULL REFERENCES "ReporteAveria"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "mensaje" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AlertaStock_reporteId_key" ON "AlertaStock"("reporteId");
