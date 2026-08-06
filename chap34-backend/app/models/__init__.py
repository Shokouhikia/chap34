"""
Import every model module here so Alembic's autogenerate can discover
all tables through SQLModel.metadata, even though nothing else in the
app imports these modules directly.
"""
from app.models.session import AnonymousSession  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.otp import OTPCode  # noqa: F401
from app.models.photo import Photo  # noqa: F401
from app.models.address import Address  # noqa: F401
from app.models.order import Order, OrderStatusHistory  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.print_job import PrintJob  # noqa: F401
from app.models.atelier import Atelier  # noqa: F401
from app.models.operator import Operator  # noqa: F401
from app.models.print_batch import PrintBatch  # noqa: F401
from app.models.shipment import Shipment  # noqa: F401
