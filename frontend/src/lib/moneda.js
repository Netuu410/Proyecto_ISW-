export const moneda = valor => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
