// Llegeix a Mailpit l’enllaç de verificació del registre. No imprimeix el token.

export async function correuDeVerificacio(mailpit, email) {
  for (let i = 0; i < 60; i += 1) {
    const query = encodeURIComponent(`to:${email}`);
    const resposta = await fetch(`${mailpit}/api/v1/search?query=${query}&limit=50`);
    const llista = await resposta.json();
    const missatge = (llista.messages ?? []).find((m) => String(m.Subject).startsWith("Verifica el correu"));
    if (missatge) {
      const detall = await (await fetch(`${mailpit}/api/v1/message/${missatge.ID}`)).json();
      const url = String(detall.Text).match(/https?:\/\/\S+/)?.[0] ?? "";
      const token = decodeURIComponent((url.split("#")[1] ?? "").trim());
      return { url, token };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}
