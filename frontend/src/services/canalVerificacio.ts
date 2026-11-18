import type { InjectionKey } from "vue";
import { io } from "socket.io-client";

export class ConnexioVerificacioError extends Error {
  constructor() {
    super("connexió");
    this.name = "ConnexioVerificacioError";
  }
}

export type CodiVerificacio = {
  challenge_id: string;
  code: string;
  expires_at: string;
};

export type CanalVerificacio = {
  assegurar(): Promise<string>;
  esperarCodi(challengeId: string): Promise<CodiVerificacio>;
  enDesconnexio(avis: () => void): () => void;
  tancar(): void;
};

export const canalVerificacioKey: InjectionKey<CanalVerificacio> = Symbol("canalVerificacio");

type SocketMinim = {
  on(event: string, handler: (data?: unknown) => void): void;
  disconnect(): void;
};

type Espera<T> = {
  resolve: (valor: T) => void;
  reject: (error: Error) => void;
};

function text(data: unknown, camp: string): string {
  if (typeof data !== "object" || data === null || !(camp in data)) {
    return "";
  }
  const valor = (data as Record<string, unknown>)[camp];
  return typeof valor === "string" ? valor : "";
}

function connecta(): SocketMinim {
  return io({
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: false,
    autoConnect: true,
  }) as SocketMinim;
}

export function createCanalVerificacio(connect: () => SocketMinim = connecta): CanalVerificacio {
  let socket: SocketMinim | null = null;
  let canal = "";
  let tancant = false;
  let esperaCanal: Espera<string> | null = null;
  let esperaCodi: Espera<CodiVerificacio> | null = null;
  let pendent: CodiVerificacio | null = null;
  let desconnexio: (() => void) | null = null;

  function falla(reject?: (error: Error) => void) {
    reject?.(new ConnexioVerificacioError());
  }

  function obre(): SocketMinim {
    if (socket) {
      return socket;
    }
    const actual = connect();
    socket = actual;
    actual.on("verificacio:canal", (data: unknown) => {
      canal = text(data, "channel");
      const espera = esperaCanal;
      esperaCanal = null;
      if (!canal) {
        falla(espera?.reject);
        return;
      }
      espera?.resolve(canal);
    });
    actual.on("verificacio:codi", (data: unknown) => {
      const rebut: CodiVerificacio = {
        challenge_id: text(data, "challenge_id"),
        code: text(data, "code"),
        expires_at: text(data, "expires_at"),
      };
      if (!rebut.challenge_id || !rebut.code) {
        return;
      }
      if (esperaCodi) {
        const espera = esperaCodi;
        esperaCodi = null;
        espera.resolve(rebut);
        return;
      }
      pendent = rebut;
    });
    actual.on("disconnect", () => {
      canal = "";
      const esperaC = esperaCanal;
      const esperaK = esperaCodi;
      esperaCanal = null;
      esperaCodi = null;
      if (tancant) {
        return;
      }
      falla(esperaC?.reject);
      falla(esperaK?.reject);
      desconnexio?.();
    });
    actual.on("connect_error", () => {
      const espera = esperaCanal;
      esperaCanal = null;
      falla(espera?.reject);
    });
    return actual;
  }

  return {
    assegurar() {
      const actual = obre();
      if (canal) {
        return Promise.resolve(canal);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (esperaCanal) {
            esperaCanal = null;
            reject(new ConnexioVerificacioError());
          }
        }, 8000);
        esperaCanal = {
          resolve: (valor) => {
            clearTimeout(timer);
            resolve(valor);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        };
        void actual;
      });
    },

    esperarCodi(challengeId) {
      if (pendent?.challenge_id === challengeId) {
        const rebut = pendent;
        pendent = null;
        return Promise.resolve(rebut);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (esperaCodi) {
            esperaCodi = null;
            reject(new ConnexioVerificacioError());
          }
        }, 8000);
        esperaCodi = {
          resolve: (valor) => {
            clearTimeout(timer);
            if (valor.challenge_id !== challengeId) {
              reject(new ConnexioVerificacioError());
              return;
            }
            resolve(valor);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        };
      });
    },

    enDesconnexio(avis) {
      desconnexio = avis;
      return () => {
        if (desconnexio === avis) {
          desconnexio = null;
        }
      };
    },

    tancar() {
      tancant = true;
      canal = "";
      pendent = null;
      esperaCanal = null;
      esperaCodi = null;
      socket?.disconnect();
      socket = null;
      tancant = false;
    },
  };
}
