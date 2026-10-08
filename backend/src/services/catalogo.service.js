import { prisma } from '../database.js';
export const crearProducto = (data) => prisma.catalogoItem.create({ data });
export const obtenerCatalogo = () => prisma.catalogoItem.findMany();
