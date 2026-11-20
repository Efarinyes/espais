export type PartDonut = {
  id: string;
  valor: number;
  color: string;
};

export type ArcDonut = {
  id: string;
  color: string;
  /** Llargada visible i resta fins a 100 (el cercle fa `pathLength="100"`). */
  dasharray: string;
  dashoffset: number;
};

function arrodoneix(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

/** Separació entre parts quan n’hi ha més d’una, en unitats de 100 de la circumferència. */
const SEPARACIO = 0.8;

/**
 * Converteix valors en arcs d’un donut. `total` és el 100 %: sense ell és la suma de les parts.
 * Una part sense valor no té arc. Si les parts passen del total, l’última es talla.
 */
export function arcsDonut(parts: readonly PartDonut[], total?: number): ArcDonut[] {
  const amb = parts.filter((part) => part.valor > 0);
  const base = total ?? amb.reduce((suma, part) => suma + part.valor, 0);
  if (base <= 0) {
    return [];
  }
  const separacio = amb.length > 1 ? SEPARACIO : 0;
  let inici = 0;
  const arcs: ArcDonut[] = [];
  for (const part of amb) {
    if (inici >= 100) {
      break;
    }
    const llargada = Math.min((part.valor / base) * 100, 100 - inici);
    const visible = arrodoneix(Math.max(llargada - separacio, 0.01));
    arcs.push({
      id: part.id,
      color: part.color,
      dasharray: `${visible} ${arrodoneix(100 - visible)}`,
      dashoffset: -arrodoneix(inici),
    });
    inici += llargada;
  }
  return arcs;
}
