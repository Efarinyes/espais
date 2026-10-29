from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.adapters.memory.identity import FixedClock
from app.adapters.tokens import HmacTokenIssuer


def test_issued_token_roundtrips_user_id() -> None:
    clock = FixedClock()
    issuer = HmacTokenIssuer("secret-test", clock)
    user_id = UUID(int=7)
    token = issuer.issue(user_id)
    assert issuer.parse(token) == user_id


def test_tampered_token_is_rejected() -> None:
    issuer = HmacTokenIssuer("secret-test", FixedClock())
    token = issuer.issue(UUID(int=1))
    assert issuer.parse(token + "x") is None


def test_un_token_sense_versio_compta_com_a_zero() -> None:
    import hashlib
    import hmac
    import json

    from app.adapters.tokens import _b64url_encode

    clock = FixedClock()
    issuer = HmacTokenIssuer("secret-test", clock)
    user_id = UUID(int=4)
    payload = {"sub": str(user_id), "exp": int(clock.now().timestamp()) + 60}
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _b64url_encode(hmac.new(b"secret-test", body.encode("ascii"), hashlib.sha256).digest())
    token = f"{body}.{signature}"
    assert issuer.parse(token) == user_id
    assert issuer.session_version(token) == 0
    assert issuer.session_version(issuer.issue(user_id, 2)) == 2


def test_expired_token_is_rejected() -> None:
    start = datetime(2026, 9, 8, 12, 0, tzinfo=UTC)
    issuer = HmacTokenIssuer("secret-test", FixedClock(start), ttl_seconds=60)
    token = issuer.issue(UUID(int=1))
    later = HmacTokenIssuer("secret-test", FixedClock(start + timedelta(minutes=2)), ttl_seconds=60)
    assert later.parse(token) is None
