"""El registre d'un correu fallit no inclou adreces ni el missatge del servidor."""

import logging
import smtplib

import pytest

from app.usecases.mail_failure import log_mail_failure


def test_un_remitent_refusat_nomes_deixa_el_codi(caplog: pytest.LogCaptureFixture) -> None:
    sender = "remitent.fictici@example.com"
    exc = smtplib.SMTPSenderRefused(553, b"5.1.8 <" + sender.encode() + b">: sender rejected", sender)
    with caplog.at_level(logging.ERROR):
        log_mail_failure(logging.getLogger("app.correu"), "de prova", exc)
    assert sender not in caplog.text
    assert "sender rejected" not in caplog.text
    assert "SMTPSenderRefused" in caplog.text
    assert "smtp 553" in caplog.text


def test_dos_destinataris_nomes_deixen_els_codis(caplog: pytest.LogCaptureFixture) -> None:
    first = "un.fictici@example.com"
    second = "dos.fictici@example.com"
    exc = smtplib.SMTPRecipientsRefused({first: (450, b"greylisted " + first.encode()), second: (550, b"unknown")})
    with caplog.at_level(logging.ERROR):
        log_mail_failure(logging.getLogger("app.correu"), "de prova", exc)
    assert first not in caplog.text
    assert second not in caplog.text
    assert "greylisted" not in caplog.text
    assert "smtp 450,550" in caplog.text


def test_un_error_sense_codi_deixa_el_tipus(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.ERROR):
        log_mail_failure(logging.getLogger("app.correu"), "de prova", ConnectionRefusedError("111"))
    assert "ConnectionRefusedError" in caplog.text
    assert "smtp" not in caplog.text
