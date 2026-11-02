function canal(hex: string, index: number): number {
  const valor = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
  return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const color = hex.replace("#", "");
  const r = canal(color, 0);
  const g = canal(color, 2);
  const b = canal(color, 4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function relacioContrast(fons: string, text: string): number {
  const clar = Math.max(luminancia(fons), luminancia(text));
  const fosc = Math.min(luminancia(fons), luminancia(text));
  return (clar + 0.05) / (fosc + 0.05);
}
