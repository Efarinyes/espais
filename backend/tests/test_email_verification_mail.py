"""L’enllaç de verificació va al fragment i surt del domini públic."""

from app.adapters.email_verification_mail import text_verificacio


def test_el_token_va_al_fragment_del_domini_public() -> None:
    subject, body = text_verificacio("token-secret", "https://espais.duckdns.org")
    assert subject == "Verifica el correu d’Espais"
    assert "https://espais.duckdns.org/verificar#token-secret" in body
    assert "/verificar/token-secret" not in body
    assert "mailpit" not in body
