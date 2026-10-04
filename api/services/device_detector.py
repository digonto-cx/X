from fastapi import HTTPException
from api.config import supabase

def validate_device_registration(device_id: str):
    """চেক করবে এই ডিভাইসে আগে একাউন্ট খোলা হয়েছে কিনা"""
    existing = supabase.table("users").select("id").eq("device_id", device_id).execute().data
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="এই ডিভাইস থেকে ইতিমধ্যে একটি একাউন্ট খোলা হয়েছে! একটি ডিভাইসে কেবল একটি একাউন্ট অনুমোদিত।"
        )

def validate_referral_device(device_model: str, referral_code: str):
    """চেক করবে রেফারার এবং নিউ ইউজারের ডিভাইস মডেল সেইম কিনা"""
    if not referral_code:
        return None
        
    referrer = supabase.table("users").select("id, balance, device_model").eq("referral_code", referral_code).execute().data
    if not referrer:
        return None
        
    ref_user = referrer[0]
    # ডিভাইস মডেল ক্লিন করে চেক করা (Ex: "Samsung Galaxy A52" vs "samsung galaxy a52")
    if ref_user["device_model"].strip().lower() == device_model.strip().lower():
        raise HTTPException(
            status_code=400, 
            detail="একই মডেলের ডিভাইসের মধ্যে রেফারেল গ্রহণযোগ্য নয়!"
        )
        
    return ref_user
