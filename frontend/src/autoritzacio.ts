export const POLITICA_RUTES = {
  inici: "publica",
  "politica-cookies": "publica",
  "recuperar-acces": "publica",
  "verificar-correu": "publica",
  registre: "convidat",
  "iniciar-sessio": "convidat",
  "acceptar-invitacio": "convidat",
  espais: "compartida",
  calendari: "compartida",
  "espai-nou": "responsable",
  "espai-editar": "responsable",
  analisi: "responsable",
  "convidar-coordinador": "responsable",
  "colors-entitat": "responsable",
  avisos: "coordinador",
  "avisos-enviats": "responsable",
} as const;

export type NomRuta = keyof typeof POLITICA_RUTES;
export type AccesRuta = (typeof POLITICA_RUTES)[NomRuta];
export type RolConegut = "responsible" | "coordinator";

export type SessioAcces = {
  iniciada: boolean;
  confirmada: boolean;
  role: string;
};

export type DestinacioAcces = true | { name: "espais" | "iniciar-sessio" | "inici" };

const RUTA_COMPARTIDA = "espais" satisfies NomRuta;

export function esRolConegut(role: string): role is RolConegut {
  return role === "responsible" || role === "coordinator";
}

export function accesDeNom(nom: unknown): AccesRuta | "desconeguda" {
  if (typeof nom !== "string" || !(nom in POLITICA_RUTES)) {
    return "desconeguda";
  }
  return POLITICA_RUTES[nom as NomRuta];
}

export function esPrivada(nom: unknown): boolean {
  const acces = accesDeNom(nom);
  return acces === "compartida" || acces === "responsable" || acces === "coordinador" || acces === "desconeguda";
}

export function calVerificarSessio(nom: unknown, sessio: Pick<SessioAcces, "iniciada" | "confirmada">): boolean {
  if (!sessio.iniciada || sessio.confirmada) {
    return false;
  }
  if (nom === "inici") {
    return true;
  }
  const acces = accesDeNom(nom);
  return acces !== "publica";
}

export function decisioAcces(nom: unknown, sessio: SessioAcces): DestinacioAcces {
  if (nom === "inici") {
    if (sessio.iniciada && sessio.confirmada && esRolConegut(sessio.role)) {
      return { name: RUTA_COMPARTIDA };
    }
    return true;
  }

  const acces = accesDeNom(nom);
  if (acces === "publica") {
    return true;
  }
  if (acces === "convidat") {
    if (sessio.iniciada && sessio.confirmada && esRolConegut(sessio.role)) {
      return { name: RUTA_COMPARTIDA };
    }
    return true;
  }
  if (!sessio.iniciada || !sessio.confirmada || !esRolConegut(sessio.role)) {
    return { name: "iniciar-sessio" };
  }
  if (acces === "compartida") {
    return true;
  }
  if (acces === "responsable" && sessio.role === "responsible") {
    return true;
  }
  if (acces === "coordinador" && sessio.role === "coordinator") {
    return true;
  }
  return { name: RUTA_COMPARTIDA };
}

export function potAccedir(nom: NomRuta, role: string): boolean {
  return (
    decisioAcces(nom, { iniciada: true, confirmada: true, role }) === true
  );
}

export function metaDeRuta(nom: NomRuta): {
  acces: AccesRuta;
  requiresAuth?: true;
  requiresResponsible?: true;
  requiresCoordinator?: true;
  guestOnly?: true;
} {
  const acces = POLITICA_RUTES[nom];
  if (acces === "publica") {
    return { acces };
  }
  if (acces === "convidat") {
    return { acces, guestOnly: true };
  }
  if (acces === "compartida") {
    return { acces, requiresAuth: true };
  }
  if (acces === "responsable") {
    return { acces, requiresAuth: true, requiresResponsible: true };
  }
  return { acces, requiresAuth: true, requiresCoordinator: true };
}
