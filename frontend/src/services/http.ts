export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type OpcionsApi = RequestInit & {
  token?: string;
};

export async function fetchApi<T>(url: string, options: OpcionsApi = {}): Promise<T> {
  const { token, headers, ...resta } = options;
  const capcaleres = new Headers(headers);
  if (token) {
    capcaleres.set("Authorization", `Bearer ${token}`);
  }
  const metode = (resta.method ?? "GET").toUpperCase();
  if (
    resta.body !== undefined &&
    (metode === "POST" || metode === "PUT" || metode === "PATCH") &&
    !capcaleres.has("Content-Type")
  ) {
    capcaleres.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...resta, headers: capcaleres });
  if (!res.ok) {
    throw new ApiError(await missatgeError(res), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

async function missatgeError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    /* cos no JSON */
  }
  return "S’ha produït un error.";
}
