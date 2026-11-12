const PALETA = [
  { main: "#DC2626", on: "#FFFFFF" },
  { main: "#0F766E", on: "#FFFFFF" },
  { main: "#15803D", on: "#FFFFFF" },
  { main: "#65A30D", on: "#1C1917" },
  { main: "#6D28D9", on: "#FFFFFF" },
  { main: "#F9A8D4", on: "#1C1917" },
  { main: "#EAB308", on: "#1C1917" },
  { main: "#1D4ED8", on: "#FFFFFF" },
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
