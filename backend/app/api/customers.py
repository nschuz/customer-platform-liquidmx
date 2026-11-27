"""Customer endpoints: HTTP only. Business rules live in the service."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.repositories import SQLAlchemyCustomerRepository
from app.schemas import (
    CustomerCreate,
    CustomerOut,
    CustomerStatus,
    CustomerStatusUpdate,
    ErrorResponse,
)
from app.services import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])

# What the OpenAPI document promises for errors: the envelope the handlers really answer with.
NOT_FOUND: dict[str, Any] = {"model": ErrorResponse, "description": "Customer not found."}
CONFLICT: dict[str, Any] = {"model": ErrorResponse, "description": "Email already registered."}
INVALID_INPUT: dict[str, Any] = {"model": ErrorResponse, "description": "Invalid input."}


def get_customer_service(
    session: Annotated[Session, Depends(get_session)],
) -> CustomerService:
    """Wires the service to the SQLAlchemy repository (tests override `get_session`)."""
    return CustomerService(SQLAlchemyCustomerRepository(session))


Service = Annotated[CustomerService, Depends(get_customer_service)]


@router.post("", status_code=201, responses={409: CONFLICT, 422: INVALID_INPUT})
def create_customer(payload: CustomerCreate, service: Service) -> CustomerOut:
    return CustomerOut.model_validate(service.create_customer(payload.name, payload.email))


@router.get("", responses={422: INVALID_INPUT})
def list_customers(service: Service, status: CustomerStatus | None = None) -> list[CustomerOut]:
    return [CustomerOut.model_validate(customer) for customer in service.list_customers(status)]


@router.get("/{customer_id}", responses={404: NOT_FOUND, 422: INVALID_INPUT})
def get_customer(customer_id: uuid.UUID, service: Service) -> CustomerOut:
    return CustomerOut.model_validate(service.get_customer(customer_id))


@router.patch("/{customer_id}/status", responses={404: NOT_FOUND, 422: INVALID_INPUT})
def update_customer_status(
    customer_id: uuid.UUID, payload: CustomerStatusUpdate, service: Service
) -> CustomerOut:
    return CustomerOut.model_validate(service.update_status(customer_id, payload.status))
