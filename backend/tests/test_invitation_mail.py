"""Adaptador de correu d’invitació, sense SMTP real."""

import smtplib

import pytest

from app.adapters.invitation_mail import (
    SmtpInvitationMailer,
    build_invitation_mailer,
    origen_public,
    text_invitacio,
)
from app.ports.invitation_mail import InvitationMessage, NoInvitationMailer


def test_sense_host_no_hi_ha_correu(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ESPAIS_SMTP_HOST", raising=False)
    mailer = build_invitation_mailer()
    assert isinstance(mailer, NoInvitationMailer)
    assert mailer.configured() is False


def test_origen_public(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ESPAIS_DOMAIN", "http://localhost")
    assert origen_public() == "http://localhost"
    monkeypatch.setenv("ESPAIS_DOMAIN", "espais.duckdns.org")
    assert origen_public() == "https://espais.duckdns.org"
    monkeypatch.setenv("ESPAIS_DOMAIN", "")
    assert origen_public() == ""


def test_el_text_porta_l_enllac_i_la_caducitat() -> None:
    subject, body = text_invitacio(
        InvitationMessage(to_email="carla@example.com", entity_name="AAVV Barri A", token="abc"),
        "https://espais.duckdns.org",
    )
    assert subject == "Invitació a AAVV Barri A"
    assert "https://espais.duckdns.org/invitar/abc" in body
    assert "14 dies" in body


def test_envia_al_email_convidat(monkeypatch: pytest.MonkeyPatch) -> None:
    enviats: list[object] = []

    class FakeSmtp:
        def __init__(self, host: str, port: int, timeout: int = 10) -> None:
            assert host == "smtp.exemple.cat"
            assert port == 587

        def __enter__(self) -> object:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def send_message(self, message: object) -> None:
            enviats.append(message)

    monkeypatch.setattr(smtplib, "SMTP", FakeSmtp)
    SmtpInvitationMailer(
        host="smtp.exemple.cat",
        port=587,
        from_addr="espais@example.com",
        origin="https://espais.duckdns.org",
    ).send(InvitationMessage(to_email="carla@example.com", entity_name="AAVV Barri A", token="abc"))
    assert len(enviats) == 1
    assert enviats[0]["To"] == "carla@example.com"  # type: ignore[index]


def test_sense_origen_no_obre_smtp() -> None:
    mailer = SmtpInvitationMailer(
        host="smtp.exemple.cat",
        port=587,
        from_addr="espais@example.com",
        origin="",
    )
    with pytest.raises(RuntimeError, match="origen públic"):
        mailer.send(
            InvitationMessage(to_email="carla@example.com", entity_name="AAVV Barri A", token="abc")
        )
