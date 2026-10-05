import os
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

# ==========================================
# ১. SUPABASE & CONFIGURATION
# ==========================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="MicroEarnX Backend API")

# CORS Middleware (সব অরিজিন অ্যালাউ করা)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ২. PYDANTIC MODELS (SCHEMAS)
# ==========================================
class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    device_id: str
    device_model: str
    referral_code: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class WithdrawSchema(BaseModel):
    user_id: str
    amount: float
    method: str
    account_number: str

class TaskCreateSchema(BaseModel):
    title: str
    description: Optional[str] = ""
    amount: float
    link: str

class GameRewardSchema(BaseModel):
    user_id: str

class GmailTaskSubmitSchema(BaseModel):
    user_id: str
    created_email: str
    password_used: str

# ==========================================
# ৩. HELPER: IMGBB MULTI-KEY ROTATION
# ==========================================
async def upload_to_imgbb(file_bytes: bytes) -> str:
    keys = supabase.table("imgbb_keys").select("*").eq("is_active", True).execute().data
    if not keys:
        raise HTTPException(status_code=500, detail="কোনো সক্রিয় ImgBB API Key পাওয়া যায়নি!")

    async with httpx.AsyncClient() as client:
        for key_obj in keys:
            api_key = key_obj["api_key"]
            try:
                res = await client.post(
                    "https://api.imgbb.com/1/upload",
                    params={"key": api_key},
                    files={"image": file_bytes},
                    timeout=15.0
                )
                if res.status_code == 200:
                    return res.json()["data"]["url"]
                else:
                    supabase.table("imgbb_keys").update({
                        "failed_count": key_obj["failed_count"] + 1
                    }).eq("id", key_obj["id"]).execute()
            except Exception:
                continue

    raise HTTPException(status_code=500, detail="সবগুলো ImgBB কী কাজ করা বন্ধ করেছে অথবা লিমিট শেষ!")

# ==========================================
# ৪. AUTHENTICATION & REFERRAL SYSTEM
# ==========================================
@app.post("/api/auth/register")
@app.post("/auth/register")
def register(data: RegisterSchema):
    # ১ ডিভাইসে একটাই একাউন্ট চেক
    device_exists = supabase.table("users").select("id").eq("device_id", data.device_id).execute().data
    if device_exists:
        raise HTTPException(status_code=400, detail="এই ডিভাইস থেকে ইতিমধ্যে একটি একাউন্ট খোলা হয়েছে!")

    referred_by_id = None
    initial_balance = 50.0  # সাধারণ সাইন-আপে ৫০ টাকা

    # রেফারেল চেক
    if data.referral_code:
        referrer = supabase.table("users").select("id, balance, device_model").eq("referral_code", data.referral_code).execute().data
        if referrer:
            ref_user = referrer[0]
            # একই ডিভাইসের মডেলে রেফার হওয়া বন্ধ
            if ref_user["device_model"].strip().lower() == data.device_model.strip().lower():
                raise HTTPException(status_code=400, detail="একই মডেলের ডিভাইসে রেফার গ্রহণযোগ্য নয়!")

            referred_by_id = ref_user["id"]
            initial_balance = 100.0  # রেফারে জয়েন করলে ১০০ টাকা
            # রেফারার পাবে ১৫ টাকা
            supabase.table("users").update({"balance": ref_user["balance"] + 15.0}).eq("id", referred_by_id).execute()

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

@app.post("/api/auth/login")
@app.post("/auth/login")
def login(data: LoginSchema):
    user = supabase.table("users").select("*").eq("email", data.email).eq("password", data.password).execute().data
    if not user:
        raise HTTPException(status_code=400, detail="ভুল ইমেইল অথবা পাসওয়ার্ড!")
    if user[0]["is_banned"]:
        raise HTTPException(status_code=403, detail="আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে!")
    return {"message": "লগইন সফল", "user": user[0]}

# ==========================================
# ৫. EARNING TASKS & SUBMISSIONS
# ==========================================
@app.get("/api/tasks")
@app.get("/tasks")
def get_user_tasks(user_id: str):
    # যেসব টাস্ক পেন্ডিং বা অ্যাপ্রুভ হয়েছে তা ফিল্টার করা (রিজেক্ট হলে পুনরায় দেখাবে)
    done_tasks = supabase.table("task_submissions").select("task_id").eq("user_id", user_id).in_("status", ["pending", "approved"]).execute().data
    excluded_ids = [t["task_id"] for t in done_tasks]

    query = supabase.table("tasks").select("*").eq("is_active", True)
    if excluded_ids:
        query = query.not_.in_("id", excluded_ids)
    return query.execute().data

@app.get("/api/task/{task_id}")
@app.get("/task/{task_id}")
def get_task_details(task_id: str):
    task = supabase.table("tasks").select("*").eq("id", task_id).execute().data
    if not task:
        raise HTTPException(status_code=404, detail="টাস্ক পাওয়া যায়নি!")
    return task[0]

@app.post("/api/task/submit")
@app.post("/task/submit")
async def submit_task_proof(
    task_id: str = Form(...),
    user_id: str = Form(...),
    proof_image: UploadFile = File(...)
):
    file_bytes = await proof_image.read()
    image_url = await upload_to_imgbb(file_bytes)

    submission = {
        "task_id": task_id,
        "user_id": user_id,
        "proof_image": image_url,
        "status": "pending"
    }
    res = supabase.table("task_submissions").insert(submission).execute()
    return {"message": "টাস্ক সাবমিশন সফল হয়েছে!", "data": res.data}

# ==========================================
# ৬. GAMES & GMAIL TASKS
# ==========================================
@app.post("/api/games/spin")
@app.post("/games/spin")
def play_spin(data: GameRewardSchema):
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")

    reward = round(random.uniform(0.5, 5.0), 2)
    new_bal = user[0]["balance"] + reward
    supabase.table("users").update({"balance": new_bal}).eq("id", data.user_id).execute()
    return {"message": "অভিনন্দন!", "reward": reward, "balance": new_bal}

@app.post("/api/games/scratch")
@app.post("/games/scratch")
def play_scratch(data: GameRewardSchema):
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")

    reward = round(random.uniform(1.0, 8.0), 2)
    new_bal = user[0]["balance"] + reward
    supabase.table("users").update({"balance": new_bal}).eq("id", data.user_id).execute()
    return {"message": "স্ক্র্যাচ সফল হয়েছে!", "reward": reward, "balance": new_bal}

@app.post("/api/games/gmail-submit")
@app.post("/games/gmail-submit")
def submit_gmail(data: GmailTaskSubmitSchema):
    submission = {
        "user_id": data.user_id,
        "proof_image": f"Gmail: {data.created_email} | Pass: {data.password_used}",
        "status": "pending"
    }
    supabase.table("task_submissions").insert(submission).execute()
    return {"message": "জিমেইল সফলভাবে জমা দেওয়া হয়েছে!"}

# ==========================================
# ৭. WITHDRAWAL SYSTEM
# ==========================================
@app.post("/api/withdraw")
@app.post("/withdraw")
def withdraw(data: WithdrawSchema):
    settings = supabase.table("site_settings").select("*").eq("id", 1).execute().data[0]

    # শর্ত ১: সর্বনিম্ন ৫০০ টাকা
    if data.amount < settings["min_withdraw"]:
        raise HTTPException(status_code=400, detail=f"সর্বনিম্ন উইথড্র {settings['min_withdraw']} টাকা!")

    # শর্ত ২: কমপক্ষে ৪টি রেফার
    refer_count = supabase.table("users").select("id", count="exact").eq("referred_by", data.user_id).execute().count
    if refer_count < settings["min_refer_withdraw"]:
        raise HTTPException(status_code=400, detail=f"উইথড্র করার জন্য কমপক্ষে {settings['min_refer_withdraw']}টি রেফার থাকা আবশ্যক!")

    # শর্ত ৩: ব্যালেন্স চেক
    user = supabase.table("users").select("balance").eq("id", data.user_id).execute().data
    if not user or user[0]["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="পর্যাপ্ত ব্যালেন্স নেই!")

    # ব্যালেন্স কেটে উইথড্র পেন্ডিং করা
    supabase.table("users").update({"balance": user[0]["balance"] - data.amount}).eq("id", data.user_id).execute()
    supabase.table("withdrawals").insert({
        "user_id": data.user_id,
        "amount": data.amount,
        "method": data.method,
        "account_number": data.account_number,
        "status": "pending"
    }).execute()

    return {"message": "উইথড্র রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে"}

# ==========================================
# ৮. ADMIN PANEL FUNCTIONALITIES
# ==========================================
@app.get("/api/admin/dashboard")
@app.get("/admin/dashboard")
def admin_dashboard():
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()
    yesterday_start = (datetime(now.year, now.month, now.day, tzinfo=timezone.utc) - timedelta(days=1)).isoformat()

    total_users = supabase.table("users").select("id", count="exact").execute().count
    today_users = supabase.table("users").select("id", count="exact").gte("created_at", today_start).execute().count
    yesterday_users = supabase.table("users").select("id", count="exact").gte("created_at", yesterday_start).lt("created_at", today_start).execute().count
    today_submissions = supabase.table("task_submissions").select("id", count="exact").gte("created_at", today_start).execute().count
    notice = supabase.table("site_settings").select("site_notice").eq("id", 1).execute().data[0]["site_notice"]

    return {
        "total_users": total_users,
        "today_users": today_users,
        "yesterday_users": yesterday_users,
        "today_submissions": today_submissions,
        "site_notice": notice
    }

@app.post("/api/admin/notice")
@app.post("/admin/notice")
def update_site_notice(notice: str = Query(...)):
    supabase.table("site_settings").update({"site_notice": notice}).eq("id", 1).execute()
    return {"message": "নোটিশ সফলভাবে আপডেট হয়েছে!"}

@app.get("/api/admin/users")
@app.get("/admin/users")
def get_admin_users(page: int = 1, search: str = ""):
    limit = 20
    start = (page - 1) * limit
    end = start + limit - 1

    query = supabase.table("users").select("*", count="exact")
    if search:
        query = query.ilike("email", f"%{search}%")

    return query.range(start, end).order("created_at", desc=True).execute()

@app.post("/api/admin/user/{user_id}/ban")
@app.post("/admin/user/{user_id}/ban")
def toggle_ban(user_id: str, is_banned: bool = Query(...)):
    supabase.table("users").update({"is_banned": is_banned}).eq("id", user_id).execute()
    return {"message": "ইউজার স্ট্যাটাস পরিবর্তিত হয়েছে"}

@app.post("/api/admin/user/{user_id}/balance")
@app.post("/admin/user/{user_id}/balance")
def admin_add_balance(user_id: str, amount: float = Query(...)):
    user = supabase.table("users").select("balance").eq("id", user_id).execute().data[0]
    supabase.table("users").update({"balance": user["balance"] + amount}).eq("id", user_id).execute()
    return {"message": "ব্যালেন্স পরিবর্তন সফল হয়েছে"}

@app.delete("/api/admin/user/{user_id}")
@app.delete("/admin/user/{user_id}")
def delete_user(user_id: str):
    supabase.table("users").delete().eq("id", user_id).execute()
    return {"message": "ইউজার মুছে ফেলা হয়েছে"}

@app.post("/api/admin/task")
@app.post("/admin/task")
def add_new_task(data: TaskCreateSchema):
    res = supabase.table("tasks").insert(data.dict()).execute()
    return {"message": "টাস্ক তৈরি হয়েছে", "data": res.data}

@app.post("/api/admin/submit/bulk")
@app.post("/admin/submit/bulk")
def bulk_process_submissions():
    pending = supabase.table("task_submissions").select("*, tasks(amount)").eq("status", "pending").limit(30).execute().data
    if not pending:
        return {"message": "কোনো পেন্ডিং সাবমিশন নেই"}

    reject_count = min(3, len(pending))
    reject_indices = set(random.sample(range(len(pending)), reject_count))

    for idx, item in enumerate(pending):
        if idx in reject_indices:
            supabase.table("task_submissions").update({"status": "rejected"}).eq("id", item["id"]).execute()
        else:
            reward = item["tasks"]["amount"] if item.get("tasks") else 10.0
            supabase.table("task_submissions").update({"status": "approved"}).eq("id", item["id"]).execute()
            user = supabase.table("users").select("balance").eq("id", item["user_id"]).execute().data[0]
            supabase.table("users").update({"balance": user["balance"] + reward}).eq("id", item["user_id"]).execute()

    return {"message": f"{len(pending)}টি সাবমিশন প্রসেস করা হয়েছে (৩টি রিজেক্ট হয়েছে)"}

@app.get("/api/admin/withdraw")
@app.get("/admin/withdraw")
def get_admin_withdrawals():
    withdrawals = supabase.table("withdrawals").select("*, users(email)").order("created_at", desc=True).execute().data
    for item in withdrawals:
        rejections = supabase.table("withdrawals").select("id", count="exact").eq("user_id", item["user_id"]).eq("status", "rejected").execute().count
        item["user_total_rejections"] = rejections
    return withdrawals

@app.get("/api/admin/imgbb")
@app.get("/admin/imgbb")
def get_imgbb_keys():
    return supabase.table("imgbb_keys").select("*").execute().data

@app.post("/api/admin/imgbb")
@app.post("/admin/imgbb")
def add_imgbb_key(api_key: str = Query(...)):
    res = supabase.table("imgbb_keys").insert({"api_key": api_key}).execute()
    return {"message": "ImgBB Key সফলভাবে যোগ করা হয়েছে", "data": res.data}

@app.delete("/api/admin/imgbb/{key_id}")
@app.delete("/admin/imgbb/{key_id}")
def delete_imgbb_key(key_id: str):
    supabase.table("imgbb_keys").delete().eq("id", key_id).execute()
    return {"message": "ImgBB Key মুছে ফেলা হয়েছে"}

# ==========================================
# ৯. ROOT HEALTH CHECK
# ==========================================
@app.get("/api")
@app.get("/")
def home():
    return {"status": "success", "message": "MicroEarnX API is active and running!"}
