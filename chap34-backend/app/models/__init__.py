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
from app.models.staff import StaffAccount  # noqa: F401
from app.models.print_batch import PrintBatch  # noqa: F401
from app.models.shipment import Shipment  # noqa: F401
from app.models.setting import Setting  # noqa: F401
from app.models.discount import DiscountCode  # noqa: F401
from app.models.redirect import Redirect  # noqa: F401
from app.models.contact_message import ContactMessage  # noqa: F401
