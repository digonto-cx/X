from pydantic import BaseModel

class WithdrawSchema(BaseModel):
    user_id: str
    amount: float
    method: str  # Bkash, Nagad, Rocket
    account_number: str

class WithdrawStatusUpdateSchema(BaseModel):
    status: str  # approved, rejected
