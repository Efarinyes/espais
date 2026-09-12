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
    """Dades d’espai invàlides (nom, aforament o finestres)."""


class DuplicateSpaceNameError(Exception):
    """El nom d’espai ja existeix dins la mateixa entitat."""


class SpaceNotFoundError(Exception):
    """L’espai no existeix dins l’entitat de l’actor."""


class ForbiddenError(Exception):
    """L’actor no té permís per a aquesta acció."""


class InvitationNotFoundError(Exception):
    """El token d’invitació no existeix."""


class InvitationExpiredError(Exception):
    """El token d’invitació ha caducat."""


class InvitationAcceptedError(Exception):
    """El token d’invitació ja s’ha fet servir."""


class InvalidReservationError(Exception):
    """Interval, disponibilitat o espai invàlids per a la reserva."""


class ReservationOverlapError(Exception):
    """Ja hi ha una reserva confirmada que solapa aquest interval."""


class ReservationNotFoundError(Exception):
    """La reserva no existeix dins l’entitat de l’actor."""


class InvalidAttendanceError(Exception):
    """Compte d’assistència invàlid o reserva que no admet registre."""


class InvalidCancellationError(Exception):
    """La reserva no es pot anul·lar (ja anul·lada o estat invàlid)."""


class NotificationNotFoundError(Exception):
    """L’avís no existeix per a aquest usuari i entitat."""


class NotificationNotReadError(Exception):
    """Només es poden arxivar avisos ja llegits."""
