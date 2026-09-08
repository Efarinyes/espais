"""Hash de contrasenya amb bcrypt (ja a l’entorn espais)."""

import bcrypt


class BcryptPasswordHasher:
    def hash(self, raw: str) -> str:
        return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("ascii")
