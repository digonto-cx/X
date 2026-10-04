from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
from api.config import supabase

router = APIRouter(prefix="/games", tags=["Games & Micro-Tasks"])

class GameRewardSchema(BaseModel):
    user_id: str

class GmailTaskSubmitSchema(BaseModel):
    user_id: str
    created_email: str
    password_used: str

# 1. Spin Wheel Logic (1 থেকে 10 টাকার ভেতর র্যান্ডম প্রাইজ)
@router.post("/spin")
def play_spin(data: GameRewardSchema):
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
        
    reward = round(random.uniform(0.5, 5.0), 2)  # 0.50 থেকে 5 টাকা পর্যন্ত রিওয়ার্ড
    new_balance = user[0]["balance"] + reward
    
    supabase.table("users").update({"balance": new_balance}).eq("id", data.user_id).execute()
    return {"message": "অভিনন্দন!", "reward": reward, "new_balance": new_balance}

# 2. Scratch Card Logic (র্যান্ডম কার্ড আর্নিং)
@router.post("/scratch")
def play_scratch(data: GameRewardSchema):
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
        
    reward = round(random.uniform(1.0, 8.0), 2)
    new_balance = user[0]["balance"] + reward
    
    supabase.table("users").update({"balance": new_balance}).eq("id", data.user_id).execute()
    return {"message": "স্ক্র্যাচ সফল হয়েছে!", "reward": reward, "new_balance": new_balance}

# 3. Gmail Creation Task (ইউজার জিমেইল বানিয়ে জমা দিলে)
@router.post("/gmail-task/submit")
def submit_gmail_task(data: GmailTaskSubmitSchema):
    # জিমেইল টাস্কের ডিফল্ট রেট (যেমন ১০ টাকা)
    REWARD_AMOUNT = 10.0
    
    # এখানে টাস্ক সাবমিশন হিস্ট্রি হিসেবে জমা রাখা হবে
    task_log = {
        "user_id": data.user_id,
        "proof_image": f"Email: {data.created_email} | Pass: {data.password_used}",
        "status": "pending"
    }
    supabase.table("task_submissions").insert(task_log).execute()
    return {"message": "জিমেইল সফলভাবে জমা হয়েছে, অ্যাডমিন ভেরিফাই করলে টাকা যোগ হবে!"}
