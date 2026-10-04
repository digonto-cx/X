from pydantic import BaseModel
from typing import Optional

class CreateTaskSchema(BaseModel):
    title: str
    description: Optional[str] = ""
    amount: float
    link: str
