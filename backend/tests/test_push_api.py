"""HTTP de Web Push: configuració, subscripció i enviament en modificar o anul·lar."""

import json
import logging
from concurrent.futures import Executor, Future
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from py_vapid import Vapid, b64urlencode
from pywebpush import WebPushException

from app.adapters.memory.push import RecordingPushGateway
from app.adapters.webpush import (
    PywebpushGateway,
    VapidConfig,
    public_key_of,
    vapid_config_from_env,
)
from app.domain.errors import PushDeliveryError, PushSubscriptionExpiredError
from app.domain.notification_text import PushMessage
from app.domain.push import PushSubscription
from app.main import create_app
from tests.notificacions_http import Escenari, crea_escenari

ENDPOINT = "https://fcm.googleapis.com/fcm/send/api-secret-endpoint"
OTHER_ENDPOINT = "https://updates.push.services.mozilla.com/wpush/v2/api-other-endpoint"
SUBSCRIPTION = {"endpoint": ENDPOINT, "keys": {"p256dh": "clau-p256dh-api", "auth": "clau-auth-api"}}


class _Inline(Executor):
    def submit(self, fn, /, *args, **kwargs):  # type: ignore[no-untyped-def]
        fn(*args, **kwargs)
        future: Future[None] = Future()
        future.set_result(None)
        return future


def _new_private_key() -> str:
    vapid = Vapid()
    vapid.generate_keys()
    raw = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
    return b64urlencode(raw)


def _config() -> VapidConfig:
    private = _new_private_key()
    return VapidConfig(private_key=private, subject="mailto:admin@example.com", public_key=public_key_of(private))


def _app(factory, *, push: bool = True, gateway: RecordingPushGateway | None = None):  # type: ignore[no-untyped-def]
    app = create_app(session_factory=factory)
    app.state.push_config = _config() if push else None
    app.state.push_gateway = gateway or RecordingPushGateway()
    app.state.push_executor = _Inline()
    return app


def _escenari(factory, **kwargs) -> tuple[Escenari, RecordingPushGateway]:  # type: ignore[no-untyped-def]
    gateway = kwargs.pop("gateway", None) or RecordingPushGateway()
    app = _app(factory, gateway=gateway, **kwargs)
    return crea_escenari(TestClient(app)), gateway


def _subscriu(env: Escenari, who: dict[str, str] | None = None, endpoint: str = ENDPOINT):  # type: ignore[no-untyped-def]
    body = {"endpoint": endpoint, "keys": SUBSCRIPTION["keys"]}
    return env.client.put("/push/subscripcio", headers=who or env.carla, json=body)


def test_la_clau_publica_es_deriva_de_la_privada_i_la_configuracio_arriba_al_coordinador(  # type: ignore[no-untyped-def]
    sqlite_session_factory,
) -> None:
    env, _ = _escenari(sqlite_session_factory)

    response = env.client.get("/push/configuracio", headers=env.carla)

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["public_key"] == env.client.app.state.push_config.public_key
    assert "private" not in response.text
    assert env.client.app.state.push_config.private_key not in response.text


def test_sense_vapid_el_push_es_veu_desactivat_i_la_subscripcio_es_rebutja(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, _ = _escenari(sqlite_session_factory, push=False)

    assert env.client.get("/push/configuracio", headers=env.carla).json() == {
        "enabled": False,
        "public_key": None,
    }
    assert _subscriu(env).status_code == 503


def test_el_responsable_i_la_sessio_anonima_no_gestionen_push(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, _ = _escenari(sqlite_session_factory)

    assert env.client.get("/push/configuracio", headers=env.responsable).status_code == 403
    assert _subscriu(env, env.responsable).status_code == 403
    assert env.client.get("/push/configuracio").status_code == 401
    assert env.client.put("/push/subscripcio", json=SUBSCRIPTION).status_code == 401
    assert env.client.post("/push/subscripcio/cancelacio", json={"endpoint": ENDPOINT}).status_code == 401
    cancel = env.client.post(
        "/push/subscripcio/cancelacio", headers=env.responsable, json={"endpoint": ENDPOINT}
    )
    assert cancel.status_code == 403


@pytest.mark.parametrize(
    "body",
    [
        {"endpoint": "http://fcm.googleapis.com/x", "keys": SUBSCRIPTION["keys"]},
        {"endpoint": "https://intern.example.com/x", "keys": SUBSCRIPTION["keys"]},
        {"endpoint": "https://127.0.0.1/x", "keys": SUBSCRIPTION["keys"]},
        {"endpoint": ENDPOINT, "keys": {"p256dh": "", "auth": "x"}},
    ],
)
def test_una_subscripcio_invalida_es_rebutja_amb_400(sqlite_session_factory, body) -> None:  # type: ignore[no-untyped-def]
    env, _ = _escenari(sqlite_session_factory)
    assert env.client.put("/push/subscripcio", headers=env.carla, json=body).status_code == 400


def test_una_subscripcio_mal_formada_es_rebutja_amb_422(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, _ = _escenari(sqlite_session_factory)
    assert env.client.put("/push/subscripcio", headers=env.carla, json={"endpoint": ENDPOINT}).status_code == 422


def test_una_modificacio_del_responsable_envia_un_push_al_coordinador_subscrit(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    assert _subscriu(env).status_code == 204
    reserva = env.reserva(10)

    assert env.reprograma(reserva, 12, reason="acte municipal").status_code == 200

    [(subscripcio, missatge)] = gateway.sent
    assert subscripcio.endpoint == ENDPOINT
    assert missatge.title == "Reserva modificada: Sala 1"
    assert "Abans: dimarts 8 de setembre, 10:00–11:00" in missatge.body
    assert "Ara: dimarts 8 de setembre, 12:00–13:00" in missatge.body
    assert "Motiu: acte municipal" in missatge.body
    [avis] = env.avisos()
    assert missatge.url == f"/avisos?avis={avis['id']}"
    assert avis["read_at"] is None


def test_una_anul_lacio_del_responsable_envia_un_push_amb_l_horari_original(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env)
    reserva = env.reserva(10)

    assert env.anula(reserva).status_code == 200

    [(_, missatge)] = gateway.sent
    assert missatge.title == "Reserva anul·lada: Sala 1"
    assert "Horari original: dimarts 8 de setembre, 10:00–11:00." in missatge.body


def test_el_push_no_marca_l_avis_com_a_llegit_ni_el_resta_de_la_llista(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env)
    reserva = env.reserva(10)
    env.anula(reserva)

    assert len(gateway.sent) == 1
    [avis] = env.avisos()
    assert avis["read_at"] is None
    [enviat] = env.client.get("/avisos/enviats", headers=env.responsable).json()
    assert enviat["read_at"] is None


def test_els_canvis_del_propi_coordinador_o_sense_canvi_no_envien_push(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env)
    reserva = env.reserva(10)

    env.reprograma(reserva, 12, who=env.carla)
    env.reprograma(reserva, 12)
    env.anula(reserva, who=env.carla)

    assert gateway.sent == []


def test_el_push_nomes_va_al_coordinador_afectat(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env, env.carla, ENDPOINT)
    _subscriu(env, env.oriol, OTHER_ENDPOINT)
    reserva = env.reserva(10, who=env.oriol)

    env.anula(reserva)

    assert [item.endpoint for item, _ in gateway.sent] == [OTHER_ENDPOINT]


def test_sense_subscripcio_l_avis_in_app_es_crea_igualment(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    reserva = env.reserva(10)

    assert env.anula(reserva).status_code == 200

    assert gateway.sent == []
    assert len(env.avisos()) == 1


def test_un_servei_de_push_caigut_no_trenca_la_modificacio_i_l_avis_persisteix(  # type: ignore[no-untyped-def]
    sqlite_session_factory, caplog: pytest.LogCaptureFixture
) -> None:
    env, _ = _escenari(sqlite_session_factory, gateway=RecordingPushGateway(failing={ENDPOINT}))
    _subscriu(env)
    reserva = env.reserva(10)

    with caplog.at_level(logging.INFO):
        moved = env.reprograma(reserva, 12)
        cancelled = env.anula(reserva)

    assert moved.status_code == 200
    assert cancelled.status_code == 200
    assert [item["type"] for item in env.avisos()] == [
        "reservation_cancelled",
        "reservation_rescheduled",
    ]
    assert ENDPOINT not in caplog.text
    assert "clau-auth-api" not in caplog.text
    assert "clau-p256dh-api" not in caplog.text
    again = env.client.post("/push/subscripcio/cancelacio", headers=env.carla, json={"endpoint": ENDPOINT})
    assert again.status_code == 204


def test_una_subscripcio_caducada_s_elimina_en_enviar(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    gateway = RecordingPushGateway(expired={ENDPOINT})
    env, _ = _escenari(sqlite_session_factory, gateway=gateway)
    _subscriu(env, endpoint=ENDPOINT)
    _subscriu(env, endpoint=OTHER_ENDPOINT)
    reserva = env.reserva(10)

    assert env.anula(reserva).status_code == 200
    assert [item.endpoint for item, _ in gateway.sent] == [OTHER_ENDPOINT]

    segona = env.reserva(12)
    gateway.sent.clear()
    assert env.anula(segona).status_code == 200
    assert [item.endpoint for item, _ in gateway.sent] == [OTHER_ENDPOINT]
    assert len(env.avisos()) == 2


def test_donar_de_baixa_atura_els_push_i_nomes_afecta_el_propi_navegador(sqlite_session_factory) -> None:  # type: ignore[no-untyped-def]
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env, env.carla, ENDPOINT)

    aliena = env.client.post("/push/subscripcio/cancelacio", headers=env.oriol, json={"endpoint": ENDPOINT})
    assert aliena.status_code == 204
    env.anula(env.reserva(10))
    assert len(gateway.sent) == 1

    propia = env.client.post("/push/subscripcio/cancelacio", headers=env.carla, json={"endpoint": ENDPOINT})
    assert propia.status_code == 204
    env.anula(env.reserva(12))
    assert len(gateway.sent) == 1
    assert len(env.avisos()) == 2


def test_un_navegador_compartit_nomes_avisa_la_darrera_persona_que_l_ha_subscrit(  # type: ignore[no-untyped-def]
    sqlite_session_factory,
) -> None:
    env, gateway = _escenari(sqlite_session_factory)
    _subscriu(env, env.carla)
    _subscriu(env, env.carla)
    _subscriu(env, env.oriol)

    env.anula(env.reserva(10, who=env.carla))
    assert gateway.sent == []

    env.anula(env.reserva(12, who=env.oriol))
    assert len(gateway.sent) == 1


def test_vapid_des_de_l_entorn(monkeypatch: pytest.MonkeyPatch) -> None:
    private = _new_private_key()
    monkeypatch.delenv("ESPAIS_VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("ESPAIS_VAPID_SUBJECT", raising=False)
    assert vapid_config_from_env() is None

    monkeypatch.setenv("ESPAIS_VAPID_PRIVATE_KEY", private)
    assert vapid_config_from_env() is None
    monkeypatch.setenv("ESPAIS_VAPID_SUBJECT", "admin@example.com")
    assert vapid_config_from_env() is None
    monkeypatch.setenv("ESPAIS_VAPID_SUBJECT", "mailto:admin@example.com")
    config = vapid_config_from_env()
    assert config is not None
    assert config.public_key == public_key_of(private)
    assert len(config.public_key) == 87

    monkeypatch.setenv("ESPAIS_VAPID_PRIVATE_KEY", "no-es-una-clau")
    assert vapid_config_from_env() is None


def test_una_clau_vapid_invalida_no_es_registra(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    monkeypatch.setenv("ESPAIS_VAPID_PRIVATE_KEY", "clau-molt-secreta-invalida")
    monkeypatch.setenv("ESPAIS_VAPID_SUBJECT", "mailto:admin@example.com")
    with caplog.at_level(logging.INFO):
        assert vapid_config_from_env() is None
    assert "clau-molt-secreta-invalida" not in caplog.text


def _gateway_amb_webpush(monkeypatch: pytest.MonkeyPatch, error: Exception | None):  # type: ignore[no-untyped-def]
    calls: list[dict[str, object]] = []

    def fake_webpush(**kwargs: object) -> None:
        calls.append(kwargs)
        if error is not None:
            raise error

    monkeypatch.setattr("app.adapters.webpush.webpush", fake_webpush)
    return PywebpushGateway(_config()), calls


def _push_subscription() -> PushSubscription:
    return PushSubscription(
        id=UUID(int=1),
        entity_id=UUID(int=2),
        user_id=UUID(int=3),
        endpoint=ENDPOINT,
        p256dh="clau-p256dh-api",
        auth="clau-auth-api",
        created_at=datetime(2026, 9, 8, tzinfo=UTC),
    )


def test_la_passarel_envia_el_text_com_a_json_amb_ttl_i_temps_maxim(monkeypatch: pytest.MonkeyPatch) -> None:
    gateway, calls = _gateway_amb_webpush(monkeypatch, None)
    message = PushMessage(title="Reserva anul·lada: Sala 1", body="Cos", url="/avisos?avis=1", tag="avis-1")

    gateway.send(_push_subscription(), message)

    [call] = calls
    assert json.loads(call["data"]) == {  # type: ignore[arg-type]
        "title": "Reserva anul·lada: Sala 1",
        "body": "Cos",
        "url": "/avisos?avis=1",
        "tag": "avis-1",
    }
    assert call["subscription_info"] == {
        "endpoint": ENDPOINT,
        "keys": {"p256dh": "clau-p256dh-api", "auth": "clau-auth-api"},
    }
    assert call["ttl"] == 24 * 60 * 60
    assert call["timeout"] == 8
    assert call["vapid_claims"] == {"sub": "mailto:admin@example.com"}


@pytest.mark.parametrize("status", [404, 410])
def test_la_passarel_tradueix_404_i_410_a_subscripcio_caducada(monkeypatch: pytest.MonkeyPatch, status: int) -> None:
    error = WebPushException("gone", response=SimpleNamespace(status_code=status, text="secret-body"))
    gateway, _ = _gateway_amb_webpush(monkeypatch, error)

    with pytest.raises(PushSubscriptionExpiredError):
        gateway.send(_push_subscription(), PushMessage("t", "b", "/avisos", "avis-1"))


def test_la_passarel_no_filtra_endpoint_ni_cos_en_altres_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    error = WebPushException("boom " + ENDPOINT, response=SimpleNamespace(status_code=500, text="secret-body"))
    gateway, _ = _gateway_amb_webpush(monkeypatch, error)

    with pytest.raises(PushDeliveryError) as raised:
        gateway.send(_push_subscription(), PushMessage("t", "b", "/avisos", "avis-1"))

    assert str(raised.value) == "status 500"
    assert ENDPOINT not in repr(raised.value)

    gateway, _ = _gateway_amb_webpush(monkeypatch, ConnectionError("dns " + ENDPOINT))
    with pytest.raises(PushDeliveryError) as network:
        gateway.send(_push_subscription(), PushMessage("t", "b", "/avisos", "avis-1"))
    assert str(network.value) == "ConnectionError"
