ALTER TABLE "CatalogoItem" ADD COLUMN "equipoId" INTEGER;
ALTER TABLE "DetalleCotizacion" ADD COLUMN "equipoId" INTEGER;
ALTER TABLE "DetalleCotizacion" ADD CONSTRAINT "DetalleCotizacion_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogoItem" ADD CONSTRAINT "CatalogoItem_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cotizacion" ALTER COLUMN "clienteId" DROP NOT NULL;
ALTER TABLE "Cotizacion" ADD COLUMN "clienteNombre" TEXT;
ALTER TABLE "ActividadAgenda" ADD COLUMN "cotizacionId" INTEGER;
CREATE UNIQUE INDEX "ActividadAgenda_cotizacionId_key" ON "ActividadAgenda"("cotizacionId");
ALTER TABLE "ActividadAgenda" ADD CONSTRAINT "ActividadAgenda_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
