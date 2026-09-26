import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, fetchApi } from "./http";

function resposta(status: number, cos: string): Response {
  return new Response(cos, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [400, "petició invàlida"],
    [403, "prohibit"],
    [404, "no trobat"],
    [409, "conflicte"],
    [500, "error intern"],
  ] as const)("converteix %s en ApiError", async (status, detail) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta(status, JSON.stringify({ detail }))),
    );

    const error: unknown = await fetchApi("/x").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, message: detail });
  });

  it("si el cos d’error no és JSON, l’ApiError usa el missatge genèric", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no json", { status: 500 })),
    );

    await expect(fetchApi("/x")).rejects.toMatchObject({
      status: 500,
      message: "S’ha produït un error.",
    });
  });

  it("afegeix Authorization i Content-Type en un POST amb cos", async () => {
    const fetchMock = vi.fn(async () => resposta(200, JSON.stringify({ id: "1" })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchApi<{ id: string }>("/x", {
        method: "POST",
        token: "abc",
        body: JSON.stringify({ a: 1 }),
      }),
    ).resolves.toEqual({ id: "1" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer abc");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("un POST sense cos no posa Content-Type i un 204 no llegeix JSON", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchApi<void>("/x", { method: "POST", token: "abc" })).resolves.toBeUndefined();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer abc");
    expect(headers.get("Content-Type")).toBeNull();
  });
});
