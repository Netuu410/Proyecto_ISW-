CREATE TABLE "SesionUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SesionUsuario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SesionUsuario_usuarioId_idx" ON "SesionUsuario"("usuarioId");
CREATE INDEX "SesionUsuario_expiresAt_idx" ON "SesionUsuario"("expiresAt");
ALTER TABLE "SesionUsuario" ADD CONSTRAINT "SesionUsuario_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
