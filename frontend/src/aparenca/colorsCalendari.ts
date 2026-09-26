const PALETA = [
  { main: "#0B5ED7", container: "#BFDBFE", onContainer: "#0F172A", darkContainer: "#163A5F", darkOn: "#F1F5F9" },
  { main: "#14B8A6", container: "#CCFBF1", onContainer: "#0F172A", darkContainer: "#134E4A", darkOn: "#F1F5F9" },
  { main: "#F7B955", container: "#EAD9C6", onContainer: "#202A2E", darkContainer: "#3D3226", darkOn: "#F5EDE3" },
  { main: "#6B8E5A", container: "#E8F0D8", onContainer: "#202A2E", darkContainer: "#1F2E1A", darkOn: "#F5EDE3" },
  { main: "#C96F4A", container: "#F6E0D6", onContainer: "#202A2E", darkContainer: "#4A2A1C", darkOn: "#F5EDE3" },
  { main: "#F97316", container: "#FFEDD5", onContainer: "#202A2E", darkContainer: "#3D2810", darkOn: "#FFF7E6" },
  { main: "#9B2C3D", container: "#F4D6DB", onContainer: "#202A2E", darkContainer: "#3F1520", darkOn: "#F5EDE6" },
  { main: "#8B5CF6", container: "#EDE9FE", onContainer: "#202A2E", darkContainer: "#2E1A5C", darkOn: "#F5EDE6" },
] as const;

function colorNom(index: number): string {
  let n = index + 1;
  let nom = "";
  while (n > 0) {
    n -= 1;
    nom = String.fromCharCode(97 + (n % 26)) + nom;
    n = Math.floor(n / 26);
  }
  return `espai${nom}`;
}

export type ColorCalendari = {
  colorName: string;
  lightColors: { main: string; container: string; onContainer: string };
  darkColors: { main: string; container: string; onContainer: string };
};

export function calendarisPerEspais(espais: { id: string }[]): Record<string, ColorCalendari> {
  return Object.fromEntries(
    espais.map((espai, index) => {
      const to = PALETA[index % PALETA.length];
      return [
        espai.id,
        {
          colorName: colorNom(index),
          lightColors: { main: to.main, container: to.container, onContainer: to.onContainer },
          darkColors: { main: to.main, container: to.darkContainer, onContainer: to.darkOn },
        },
      ];
    }),
  );
}
