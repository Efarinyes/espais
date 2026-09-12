"""Fàbrica de dependències HTTP. Sense regles de negoci."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import sessionmaker

from app.adapters.attendance import CountAttendance
from app.adapters.notifier import LoggingNotifier, SmtpNotifier, build_notifier
from app.adapters.security import BcryptPasswordHasher
from app.adapters.sqlalchemy.identity import SqlAlchemyIdentityUnitOfWork
from app.adapters.sqlalchemy.models import UserRow
from app.adapters.sqlalchemy.reservations import SqlAlchemyReservationUnitOfWork
from app.adapters.sqlalchemy.schema import bootstrap_session_factory
from app.adapters.sqlalchemy.spaces import SqlAlchemySpaceUnitOfWork
from app.adapters.system import SecretsInvitationTokenGenerator, SystemClock, UuidIdGenerator
from app.adapters.tokens import HmacTokenIssuer
from app.domain.errors import SessionNotFoundError
from app.ports.identity import TokenIssuer
from app.ports.notifications import Notifier
from app.usecases.accept_invitation import AcceptInvitation
from app.usecases.authenticate_user import AuthenticateUser
from app.usecases.cancel_reservation_by_responsible import CancelReservationByResponsible
from app.usecases.create_reservation import CreateReservation
from app.usecases.create_space import CreateSpace
from app.usecases.get_invitation import GetInvitation
from app.usecases.get_space import GetSpace
from app.usecases.get_usage_summary import GetUsageSummary
from app.usecases.invite_coordinator import InviteCoordinator
from app.usecases.list_notifications import ListNotifications
from app.usecases.list_reservations import ListReservations
from app.usecases.list_spaces import ListSpaces
from app.usecases.mark_notification_read import MarkNotificationRead
from app.usecases.record_attendance import RecordAttendance
from app.usecases.register_entity import RegisterEntity
from app.usecases.reschedule_reservation import RescheduleReservation
from app.usecases.resolve_session import ResolveSession, SessionView
from app.usecases.update_space import UpdateSpace

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class IdentityHttp:
    register: RegisterEntity
    authenticate: AuthenticateUser
    resolve: ResolveSession
    tokens: TokenIssuer
    invite: InviteCoordinator
    preview: GetInvitation
    accept: AcceptInvitation


def get_session_factory(request: Request) -> sessionmaker:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        factory = bootstrap_session_factory()
        request.app.state.session_factory = factory
    return factory


def get_token_issuer(request: Request) -> TokenIssuer:
    issuer = getattr(request.app.state, "token_issuer", None)
    if issuer is None:
        issuer = HmacTokenIssuer("espais-dev-insegur", SystemClock())
        request.app.state.token_issuer = issuer
    return issuer


@dataclass
class SpacesHttp:
    create: CreateSpace
    list: ListSpaces
    get: GetSpace
    update: UpdateSpace


@dataclass
class ReservationsHttp:
    create: CreateReservation
    list: ListReservations
    record: RecordAttendance
    cancel: CancelReservationByResponsible
    reschedule: RescheduleReservation


@dataclass
class AnalysisHttp:
    summary: GetUsageSummary


@dataclass
class NotificationsHttp:
    list: ListNotifications
    mark_read: MarkNotificationRead


def get_identity_http(request: Request) -> Iterator[IdentityHttp]:
    uow = SqlAlchemyIdentityUnitOfWork(get_session_factory(request))
    hasher = BcryptPasswordHasher()
    clock = SystemClock()
    ids = UuidIdGenerator()
    try:
        yield IdentityHttp(
            register=RegisterEntity(uow, clock, ids, hasher),
            authenticate=AuthenticateUser(uow, hasher),
            resolve=ResolveSession(uow),
            tokens=get_token_issuer(request),
            invite=InviteCoordinator(uow, clock, ids, SecretsInvitationTokenGenerator()),
            preview=GetInvitation(uow, clock),
            accept=AcceptInvitation(uow, clock, ids, hasher),
        )
    finally:
        uow.close()


def require_session(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Iterator[SessionView]:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="cal iniciar sessió")
    user_id = get_token_issuer(request).parse(creds.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="sessió invàlida")

    uow = SqlAlchemyIdentityUnitOfWork(get_session_factory(request))
    try:
        try:
            view = ResolveSession(uow).execute(user_id)
        except SessionNotFoundError:
            raise HTTPException(status_code=401, detail="sessió invàlida") from None
        yield view
    finally:
        uow.close()


def get_spaces_http(request: Request) -> Iterator[SpacesHttp]:
    uow = SqlAlchemySpaceUnitOfWork(get_session_factory(request))
    try:
        yield SpacesHttp(
            create=CreateSpace(uow, SystemClock(), UuidIdGenerator()),
            list=ListSpaces(uow),
            get=GetSpace(uow),
            update=UpdateSpace(uow),
        )
    finally:
        uow.close()


def get_notifier(request: Request) -> Notifier:
    cached = getattr(request.app.state, "notifier", None)
    if cached is not None:
        return cached
    factory = get_session_factory(request)

    def lookup_email(user_id: UUID) -> str | None:
        session = factory()
        try:
            row = session.get(UserRow, user_id)
            return row.email if row is not None else None
        finally:
            session.close()

    notifier: LoggingNotifier | SmtpNotifier = build_notifier(lookup_email)
    request.app.state.notifier = notifier
    return notifier


def get_reservations_http(request: Request) -> Iterator[ReservationsHttp]:
    uow = SqlAlchemyReservationUnitOfWork(get_session_factory(request))
    try:
        yield ReservationsHttp(
            create=CreateReservation(uow, SystemClock(), UuidIdGenerator()),
            list=ListReservations(uow),
            record=RecordAttendance(uow, CountAttendance(), SystemClock(), UuidIdGenerator()),
            cancel=CancelReservationByResponsible(
                uow, get_notifier(request), SystemClock(), UuidIdGenerator()
            ),
            reschedule=RescheduleReservation(
                uow, get_notifier(request), SystemClock(), UuidIdGenerator()
            ),
        )
    finally:
        uow.close()


def get_analysis_http(request: Request) -> Iterator[AnalysisHttp]:
    uow = SqlAlchemyReservationUnitOfWork(get_session_factory(request))
    try:
        yield AnalysisHttp(summary=GetUsageSummary(uow))
    finally:
        uow.close()


def get_notifications_http(request: Request) -> Iterator[NotificationsHttp]:
    uow = SqlAlchemyReservationUnitOfWork(get_session_factory(request))
    try:
        yield NotificationsHttp(
            list=ListNotifications(uow),
            mark_read=MarkNotificationRead(uow, SystemClock()),
        )
    finally:
        uow.close()
