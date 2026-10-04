from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    device_id: str
    device_model: str
    referral_code: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class BalanceAdjustSchema(BaseModel):
    amount: float
