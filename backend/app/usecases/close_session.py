"""Revoca el Bearer d’aquest tancament. Un altre token del mateix usuari segueix sent vàlid."""

from __future__ import annotations

from app.domain.errors import SessionNotFoundError
from app.ports.identity import TokenIssuer
from app.ports.revocation import RevocationUnitOfWork


class CloseSession:
    def __init__(self, uow: RevocationUnitOfWork, tokens: TokenIssuer) -> None:
        self._uow = uow
        self._tokens = tokens

    def execute(self, token: str) -> None:
        expires_at = self._tokens.expires_at(token)
        if expires_at is None:
            raise SessionNotFoundError()
        try:
            self._uow.revoked_tokens.add(self._tokens.fingerprint(token), expires_at)
            self._uow.commit()
        except Exception:
            self._uow.rollback()
            raise
