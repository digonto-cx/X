from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.config import supabase

router = APIRouter(prefix="/withdraw", tags=["Withdraw"])

class WithdrawSchema(BaseModel):
    user_id: str
    amount: float
    method: str
    account_number: str

@router.post("/")
def request_withdraw(data: WithdrawSchema):
    settings = supabase.table("site_settings").select("*").eq("id", 1).execute().data[0]
    
    # মিনিমাম ব্যালেন্স চেক
    if data.amount < settings["min_withdraw"]:
        raise HTTPException(status_code=400, detail=f"সর্বনিম্ন উইথড্র {settings['min_withdraw']} টাকা!")

    # রেফারেল শর্ত চেক
    refer_count = supabase.table("users").select("id", count="exact").eq("referred_by", data.user_id).execute().count
    if refer_count < settings["min_refer_withdraw"]:
        raise HTTPException(status_code=400, detail=f"উইথড্র করতে কমপক্ষে {settings['min_refer_withdraw']} টি রেফার লাগবে! আপনার রেফার: {refer_count} টি")

    # ইউজার ব্যালেন্স চেক
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user or user[0]["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="অপর্যাপ্ত অ্যাকাউন্ট ব্যালেন্স!")

    # ব্যালেন্স কাটা এবং রিকোয়েস্ট সংরক্ষণ
    supabase.table("users").update({"balance": user[0]["balance"] - data.amount}).eq("id", data.user_id).execute()
    new_req = {
        "user_id": data.user_id,
        "amount": data.amount,
        "method": data.method,
        "account_number": data.account_number,
        "status": "pending"
    }
    supabase.table("withdrawals").insert(new_req).execute()
    return {"message": "উইথড্র রিকোয়েস্ট সফল হয়েছে!"}
