"""Errors de domini / casos d’ús."""


class DuplicateEmailError(Exception):
    """L’email ja té un compte (v1: un usuari, una entitat)."""


class InvalidRegistrationError(Exception):
    """Dades d’alta invàlides (nom buit, contrasenya curta, email buit)."""
