"""Política d’autorització dels dos rols. No autentica ni llegeix la base.

El rol arriba de la membership (`ResolveSession`). Aquí només es decideix
quines accions pot fer i si el coordinador queda limitat al recurs propi.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole


class Accio(StrEnum):
    DEFINIR_ESPAI = "definir_espai"
    CONVIDAR_COORDINADOR = "convidar_coordinador"
    VEURE_COORDINADORS = "veure_coordinadors"
    CANVIAR_PALETA = "canviar_paleta"
    CREAR_RESERVA = "crear_reserva"
    VEURE_RESERVES = "veure_reserves"
    VEURE_ANALISI = "veure_analisi"
    ANULAR_AMB_AVIS = "anular_amb_avis"
    ANULAR_PROPIA = "anular_propia"
    REGISTRAR_ASSISTENCIA = "registrar_assistencia"
    REPROGRAMAR = "reprogramar"
    LLEGIR_AVISOS = "llegir_avisos"
    VEURE_AVISOS_ENVIATS = "veure_avisos_enviats"
    GESTIONAR_PUSH = "gestionar_push"


@dataclass(frozen=True)
class Regla:
    rols: frozenset[MembershipRole]
    denegat: str
    alie: str | None = None


_RESPONSABLE = frozenset({MembershipRole.RESPONSIBLE})
_COORDINADOR = frozenset({MembershipRole.COORDINATOR})
_TOTS = frozenset({MembershipRole.RESPONSIBLE, MembershipRole.COORDINATOR})

POLITICA: dict[Accio, Regla] = {
    Accio.DEFINIR_ESPAI: Regla(_RESPONSABLE, "només el responsable pot definir espais"),
    Accio.CONVIDAR_COORDINADOR: Regla(
        _RESPONSABLE, "només el responsable pot convidar coordinadors"
    ),
    Accio.VEURE_COORDINADORS: Regla(
        _RESPONSABLE, "només el responsable pot veure els coordinadors"
    ),
    Accio.CANVIAR_PALETA: Regla(
        _RESPONSABLE, "només el responsable pot canviar els colors de l’entitat"
    ),
    Accio.CREAR_RESERVA: Regla(
        _COORDINADOR,
        "el responsable no crea reserves; reprograma o anul·la les dels coordinadors",
    ),
    Accio.VEURE_RESERVES: Regla(_TOTS, "cal un rol de l’entitat per veure les reserves"),
    Accio.VEURE_ANALISI: Regla(_RESPONSABLE, "només el responsable pot veure l’anàlisi d’ús"),
    Accio.ANULAR_AMB_AVIS: Regla(
        _RESPONSABLE,
        "només el responsable pot anul·lar una reserva amb avís al coordinador",
    ),
    Accio.ANULAR_PROPIA: Regla(
        _COORDINADOR,
        "només el coordinador pot anul·lar la seva reserva",
        "només pots anul·lar les teves reserves",
    ),
    Accio.REGISTRAR_ASSISTENCIA: Regla(
        _TOTS,
        "no pots registrar l’assistència d’aquesta reserva",
        "només qui ha fet la reserva pot registrar-ne l’assistència",
    ),
    Accio.REPROGRAMAR: Regla(
        _TOTS,
        "no pots reprogramar aquesta reserva",
        "no pots reprogramar aquesta reserva",
    ),
    Accio.LLEGIR_AVISOS: Regla(_COORDINADOR, "només el coordinador pot llegir els avisos"),
    Accio.VEURE_AVISOS_ENVIATS: Regla(
        _RESPONSABLE, "només el responsable pot veure els avisos enviats"
    ),
    Accio.GESTIONAR_PUSH: Regla(
        _COORDINADOR, "només el coordinador pot gestionar les notificacions del dispositiu"
    ),
}


def permet(role: MembershipRole, accio: Accio) -> bool:
    return role in POLITICA[accio].rols


def exigir_rol(role: MembershipRole, accio: Accio) -> None:
    if not permet(role, accio):
        raise ForbiddenError(POLITICA[accio].denegat)


def exigir_recurs_propi(role: MembershipRole, accio: Accio, *, propi: bool) -> None:
    exigir_rol(role, accio)
    alie = POLITICA[accio].alie
    if alie is not None and role == MembershipRole.COORDINATOR and not propi:
        raise ForbiddenError(alie)


def exigir_reserva_no_gestionada(role: MembershipRole, *, gestionada: bool) -> None:
    """Una reserva modificada pel responsable ja només la canvia ell (ADR 0026)."""
    if role == MembershipRole.COORDINATOR and gestionada:
        raise ForbiddenError(
            "el responsable ha modificat aquesta reserva i només ell la pot tornar a canviar"
        )


def mostra_nom_de_coordinador(role: MembershipRole, *, propi: bool) -> bool:
    return role == MembershipRole.RESPONSIBLE or propi


def mostra_id_de_coordinador(role: MembershipRole) -> bool:
    return role == MembershipRole.RESPONSIBLE
