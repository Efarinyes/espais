"""L’enllaç de recuperació va al fragment i surt del domini públic."""

from app.adapters.password_reset_mail import text_recuperacio


def test_el_token_va_al_fragment_del_domini_public() -> None:
    subject, body = text_recuperacio("token-secret", "https://espais.duckdns.org")
    assert subject == "Recupera l’accés a Espais"
    assert "https://espais.duckdns.org/recuperar#token-secret" in body
    assert "/recuperar/token-secret" not in body
    assert "mailpit" not in body
