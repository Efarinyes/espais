#!/usr/bin/env python3
"""Genera un parell de claus VAPID per a Web Push.

Ús (entorn micromamba `espais`):
    python tools/generar-claus-vapid.py

Imprimeix les línies per al `.env`. Només cal la clau privada: la pública es calcula
sola. La clau privada és un secret; no la versionis. Si la canvies, cal que cada
coordinador torni a activar les notificacions al seu dispositiu.
"""

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid, b64urlencode


def main() -> None:
    vapid = Vapid()
    vapid.generate_keys()
    private = b64urlencode(vapid.private_key.private_numbers().private_value.to_bytes(32, "big"))
    public = b64urlencode(
        vapid.public_key.public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
    )
    print(f"ESPAIS_VAPID_PRIVATE_KEY={private}")
    print("ESPAIS_VAPID_SUBJECT=mailto:admin@el-teu-domini.cat")
    print(f"# Clau pública (informativa, es calcula sola): {public}")


if __name__ == "__main__":
    main()
