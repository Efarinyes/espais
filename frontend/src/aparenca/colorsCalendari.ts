const PALETA = [
  { main: "#2563EB", on: "#FFFFFF" },
  { main: "#0F766E", on: "#FFFFFF" },
  { main: "#15803D", on: "#FFFFFF" },
  { main: "#A16207", on: "#FFFFFF" },
  { main: "#C2410C", on: "#FFFFFF" },
  { main: "#B91C1C", on: "#FFFFFF" },
  { main: "#BE185D", on: "#FFFFFF" },
  { main: "#92400E", on: "#FFFFFF" },
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

export function calendarisPerEspais(espais: { id: string }[]): Record<string, ColorCalendari> {
  return Object.fromEntries(
    espais.map((espai) => {
      const to = PALETA[indexEstable(espai.id)];
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
