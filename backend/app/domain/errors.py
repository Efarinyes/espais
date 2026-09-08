"""Errors de domini / casos d’ús."""


class DuplicateEmailError(Exception):
    """L’email ja té un compte (v1: un usuari, una entitat)."""


class InvalidRegistrationError(Exception):
    """Dades d’alta invàlides (nom buit, contrasenya curta, email buit)."""


class InvalidCredentialsError(Exception):
    """Email o contrasenya incorrectes. No distingeix quin camp ha fallat."""


class SessionNotFoundError(Exception):
    """El token és vàlid però no hi ha membership (compte incoherent)."""


class InvalidSpaceError(Exception):
    """Dades d’espai invàlides (nom buit, aforament ≤ 0)."""


class DuplicateSpaceNameError(Exception):
    """El nom d’espai ja existeix dins la mateixa entitat."""


class SpaceNotFoundError(Exception):
    """L’espai no existeix dins l’entitat de l’actor."""


class ForbiddenError(Exception):
    """L’actor no té permís per a aquesta acció."""
