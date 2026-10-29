from starlette.requests import Request

from app.api.client_ip import _privada, client_ip


def _request(peer: str, forwarded: str | None = None) -> Request:
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/recuperacio",
        "raw_path": b"/recuperacio",
        "query_string": b"",
        "headers": headers,
        "client": (peer, 1234),
        "server": ("backend", 8000),
    }
    return Request(scope)


def test_un_peer_public_ignora_la_capcalera() -> None:
    request = _request("8.8.8.8", "198.51.100.9, 10.0.0.8")
    assert client_ip(request) == "8.8.8.8"
    assert _privada("8.8.8.8") is False


def test_caddy_a_la_xarxa_interna_aporta_la_ip_real() -> None:
    request = _request("172.18.0.3", "203.0.113.9")
    assert client_ip(request) == "203.0.113.9"


def test_si_hi_ha_diverses_ips_es_queda_la_darrera() -> None:
    request = _request("10.0.0.2", "1.2.3.4, 203.0.113.9")
    assert client_ip(request) == "203.0.113.9"
