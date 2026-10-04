from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
from api.config import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterSchema(BaseModel):
    email: str
    password: str
    device_id: str
    device_model: str
    referral_code: str = None

class LoginSchema(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(data: RegisterSchema):
    # ১ ডিভাইসে একটাই একাউন্ট চেক
    device_check = supabase.table("users").select("id").eq("device_id", data.device_id).execute().data
    if device_check:
        raise HTTPException(status_code=400, detail="এই ডিভাইসে ইতিমধ্যে একটি অ্যাকাউন্ট খোলা রয়েছে!")

    referred_by_id = None
    initial_balance = 50  # রেফার ছাড়া জয়েন হলে ৫০ টাকা

    if data.referral_code:
        referrer = supabase.table("users").select("id, balance, device_model").eq("referral_code", data.referral_code).execute().data
        if referrer:
            ref_user = referrer[0]
            # সেইম ডিভাইসের মডেলে রেফার হওয়া বন্ধ
            if ref_user["device_model"].strip().lower() == data.device_model.strip().lower():
                raise HTTPException(status_code=400, detail="একই মডেলের ডিভাইসে রেফার গ্রহণযোগ্য নয়!")
            
            referred_by_id = ref_user["id"]
            initial_balance = 100  # রেফারে জয়েন করলে ১০০ টাকা
            # রেফারার পাবে ১৫ টাকা
            supabase.table("users").update({"balance": ref_user["balance"] + 15}).eq("id", referred_by_id).execute()

    new_refer_code = f"MEX{random.randint(100000, 999999)}"
    user_payload = {
        "email": data.email,
        "password": data.password,
        "device_id": data.device_id,
        "device_model": data.device_model,
        "balance": initial_balance,
        "referral_code": new_refer_code,
        "referred_by": referred_by_id
    }
    res = supabase.table("users").insert(user_payload).execute()
    return {"message": "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!", "data": res.data[0]}

@router.post("/login")
def login(data: LoginSchema):
    user = supabase.table("users").select("*").eq("email", data.email).eq("password", data.password).execute().data
    if not user:
        raise HTTPException(status_code=400, detail="ভুল ইমেইল অথবা পাসওয়ার্ড!")
    if user[0]["is_banned"]:
        raise HTTPException(status_code=403, detail="আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে!")
    return {"message": "লগইন সফল", "user": user[0]}
