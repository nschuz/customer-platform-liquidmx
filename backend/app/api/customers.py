"""Customer endpoints: HTTP only. Business rules live in the service."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.repositories import SQLAlchemyCustomerRepository
from app.schemas import CustomerCreate, CustomerOut, CustomerStatus, CustomerStatusUpdate
from app.services import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


def get_customer_service(
    session: Annotated[Session, Depends(get_session)],
) -> CustomerService:
    """Wires the service to the SQLAlchemy repository (tests override `get_session`)."""
    return CustomerService(SQLAlchemyCustomerRepository(session))


Service = Annotated[CustomerService, Depends(get_customer_service)]


@router.post("", status_code=201)
def create_customer(payload: CustomerCreate, service: Service) -> CustomerOut:
    return CustomerOut.model_validate(service.create_customer(payload.name, payload.email))


@router.get("")
def list_customers(service: Service, status: CustomerStatus | None = None) -> list[CustomerOut]:
    return [CustomerOut.model_validate(customer) for customer in service.list_customers(status)]


@router.get("/{customer_id}")
def get_customer(customer_id: uuid.UUID, service: Service) -> CustomerOut:
    return CustomerOut.model_validate(service.get_customer(customer_id))


@router.patch("/{customer_id}/status")
def update_customer_status(
    customer_id: uuid.UUID, payload: CustomerStatusUpdate, service: Service
) -> CustomerOut:
    return CustomerOut.model_validate(service.update_status(customer_id, payload.status))
