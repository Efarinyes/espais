const PALETA = [
  { main: "#8E4038", on: "#FFFFFF" },
  { main: "#2F6A5C", on: "#FFFFFF" },
  { main: "#A9C48A", on: "#1C1917" },
  { main: "#3E5270", on: "#FFFFFF" },
  { main: "#E0A06A", on: "#1C1917" },
  { main: "#4E6A38", on: "#FFFFFF" },
  { main: "#D4A0B8", on: "#1C1917" },
  { main: "#8FB0C4", on: "#1C1917" },
] as const;

function indexEstable(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % PALETA.length;
}

function colorNom(id: string): string {
  let nom = "";
  for (const char of id) {
    nom += String.fromCharCode(97 + (char.charCodeAt(0) % 26));
  }
  return `espai${nom || "a"}`;
}

export type ColorCalendari = {
  colorName: string;
  lightColors: { main: string; container: string; onContainer: string };
  darkColors: { main: string; container: string; onContainer: string };
};

function ordenarIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** El to preferit surt de l’id. Si dues sales de la llista el voldrien, la d’id més gran passa al següent to lliure. */
function indexosPerSales(ids: readonly string[]): Map<string, number> {
  const assignats = new Map<string, number>();
  const usats = new Set<number>();
  for (const id of ordenarIds(ids)) {
    let index = indexEstable(id);
    if (usats.size < PALETA.length) {
      let voltes = 0;
      while (usats.has(index) && voltes < PALETA.length) {
        index = (index + 1) % PALETA.length;
        voltes += 1;
      }
      usats.add(index);
    }
    assignats.set(id, index);
  }
  return assignats;
}

export function calendarisPerEspais(espais: { id: string }[]): Record<string, ColorCalendari> {
  const indexos = indexosPerSales(espais.map((espai) => espai.id));
  return Object.fromEntries(
    espais.map((espai) => {
      const to = PALETA[indexos.get(espai.id) ?? indexEstable(espai.id)];
      const colors = { main: to.main, container: to.main, onContainer: to.on };
      return [
        espai.id,
        {
          colorName: colorNom(espai.id),
          lightColors: colors,
          darkColors: colors,
        },
      ];
    }),
  );
}
