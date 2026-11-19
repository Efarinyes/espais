"""Errors de domini / casos d’ús."""


class DuplicateEmailError(Exception):
    """L’email ja té un compte (v1: un usuari, una entitat)."""


class InvalidRegistrationError(Exception):
    """Dades d’alta invàlides (nom buit, contrasenya curta, email buit)."""


class InvalidCredentialsError(Exception):
    """Email o contrasenya incorrectes. No distingeix quin camp ha fallat."""


class SessionNotFoundError(Exception):
    """El token és vàlid però no hi ha membership (compte incoherent)."""


class InvalidPaletteError(Exception):
    """La paleta no és una de les quatre tancades de l’entitat."""


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


class InvalidPasswordResetError(Exception):
    """L’enllaç de recuperació no existeix, ha caducat o ja s’ha fet servir."""


class InvalidEmailVerificationError(Exception):
    """L’enllaç de verificació no existeix, ha caducat o ja s’ha fet servir."""


class EmailNotVerifiedError(Exception):
    """El compte existeix, però el correu del responsable encara no s’ha verificat."""


class LoginConnectionError(Exception):
    """El canal de verificació no existeix o la connexió ja no és viva."""


class LoginRateLimitedError(Exception):
    """Massa codis demanats per aquest canal o aquesta adreça."""

    def __init__(self, scope: str) -> None:
        self.scope = scope
        super().__init__(scope)


class InvalidLoginCodeError(Exception):
    """El codi no coincideix i encara queden intents."""


class LoginChallengeClosedError(Exception):
    """El repte ha caducat, s’ha usat, s’ha tancat o no és d’aquesta connexió."""

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


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


class InvalidPushSubscriptionError(Exception):
    """La subscripció push no és vàlida o no apunta a un servei de push admès."""


class PushSubscriptionExpiredError(Exception):
    """El servei de push diu que la subscripció ja no existeix (404 o 410)."""


class PushDeliveryError(Exception):
    """El servei de push no ha acceptat el missatge. No porta l’endpoint ni el cos."""
