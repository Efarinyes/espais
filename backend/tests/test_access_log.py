"""El log d’accés no guarda tokens d’invitació."""

import logging

from app.adapters.access_log import AmagaTokenInvitacio
from app.main import create_app


def _registre(path: str) -> logging.LogRecord:
    return logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("172.18.0.4:50958", "POST", path, "1.1", 201),
        exc_info=None,
    )


def test_amaga_el_token_del_cami_d_invitacio() -> None:
    filtre = AmagaTokenInvitacio()
    for path in ("/invitacions/mud1ttoiiQQGxWOLTP-3O1t3F5m6tDD/acceptar", "/invitacions/mud1ttoiiQQGxWOLTP-3O1t3F5m6tDD"):
        record = _registre(path)
        assert filtre.filter(record) is True
        missatge = record.getMessage()
        assert "mud1ttoiiQQGxWOLTP" not in missatge
        assert "/invitacions/<token>" in missatge


def test_no_toca_les_altres_rutes() -> None:
    for path in ("/invitacions", "/recuperacio", "/sessio"):
        record = _registre(path)
        AmagaTokenInvitacio().filter(record)
        assert f'"POST {path} HTTP/1.1"' in record.getMessage()


def test_l_app_instal_la_el_filtre_un_sol_cop() -> None:
    create_app()
    create_app()
    filtres = [f for f in logging.getLogger("uvicorn.access").filters if isinstance(f, AmagaTokenInvitacio)]
    assert len(filtres) == 1
