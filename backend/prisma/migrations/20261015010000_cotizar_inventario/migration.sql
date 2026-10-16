ALTER TABLE "Equipo" ADD COLUMN "costoInterno" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DetalleCotizacion" ALTER COLUMN "catalogoItemId" DROP NOT NULL;
ALTER TABLE "DetalleCotizacion" ADD COLUMN "nombreProducto" TEXT;
UPDATE "DetalleCotizacion" AS detalle
SET "nombreProducto" = catalogo."nombre"
FROM "CatalogoItem" AS catalogo WHERE catalogo."id" = detalle."catalogoItemId";
ALTER TABLE "DetalleCotizacion" ALTER COLUMN "nombreProducto" SET NOT NULL;
