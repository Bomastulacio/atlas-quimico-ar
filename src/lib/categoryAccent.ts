import type { Producto } from '@/schemas';

export function getCategoryAccent(categoria: Producto['categoria']): string {
  switch (categoria) {
    case 'metalurgia':
      return '#0A42E0';
    case 'mineria_quimica':
      return '#0B7A53';
    case 'fertilizantes':
      return '#0A42E0';
    case 'agroindustria':
      return '#C86A11';
    case 'petroquimica':
      return '#D93025';
    case 'bioenergia':
      return '#0B7A53';
  }
}
