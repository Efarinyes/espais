import pytest

from app.domain.authorization import (
    POLITICA,
    Accio,
    exigir_recurs_propi,
    exigir_rol,
    permet,
)
from app.domain.errors import ForbiddenError
from app.domain.identity import MembershipRole


def test_la_politica_cobreix_totes_les_accions() -> None:
    assert set(POLITICA) == set(Accio)


def test_el_responsable_no_crea_reserves_ni_llegeix_avisos() -> None:
    assert not permet(MembershipRole.RESPONSIBLE, Accio.CREAR_RESERVA)
    assert not permet(MembershipRole.RESPONSIBLE, Accio.LLEGIR_AVISOS)
    assert permet(MembershipRole.RESPONSIBLE, Accio.VEURE_ANALISI)
    with pytest.raises(ForbiddenError, match="no crea reserves"):
        exigir_rol(MembershipRole.RESPONSIBLE, Accio.CREAR_RESERVA)


def test_el_coordinador_no_governa_l_entitat() -> None:
    for accio in (
        Accio.DEFINIR_ESPAI,
        Accio.CONVIDAR_COORDINADOR,
        Accio.VEURE_COORDINADORS,
        Accio.CANVIAR_PALETA,
        Accio.VEURE_ANALISI,
        Accio.ANULAR_AMB_AVIS,
    ):
        assert not permet(MembershipRole.COORDINATOR, accio)
        with pytest.raises(ForbiddenError):
            exigir_rol(MembershipRole.COORDINATOR, accio)


def test_els_dos_rols_veuen_reserves_i_el_coordinador_nomes_actua_sobre_la_seva() -> None:
    assert permet(MembershipRole.RESPONSIBLE, Accio.VEURE_RESERVES)
    assert permet(MembershipRole.COORDINATOR, Accio.VEURE_RESERVES)
    exigir_recurs_propi(MembershipRole.RESPONSIBLE, Accio.REPROGRAMAR, propi=False)
    exigir_recurs_propi(MembershipRole.COORDINATOR, Accio.REPROGRAMAR, propi=True)
    with pytest.raises(ForbiddenError, match="no pots reprogramar"):
        exigir_recurs_propi(MembershipRole.COORDINATOR, Accio.REPROGRAMAR, propi=False)
