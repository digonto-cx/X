from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from api.config import supabase
from api.services.imgbb import upload_to_imgbb

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# একটিভ টাস্ক দেখানো (পেন্ডিং/অ্যাপ্রুভড গুলো ফিল্টার হবে, রিজেক্ট হলে পুনরায় দেখাবে)
@router.get("/")
def get_user_tasks(user_id: str):
    locked = supabase.table("task_submissions").select("task_id").eq("user_id", user_id).in_("status", ["pending", "approved"]).execute().data
    locked_ids = [item["task_id"] for item in locked]

    query = supabase.table("tasks").select("*").eq("is_active", True)
    if locked_ids:
        query = query.not_.in_("id", locked_ids)
    
    return query.execute().data

# টাস্ক ডিটেইলস
@router.get("/{task_id}")
def get_task_details(task_id: str):
    task = supabase.table("tasks").select("*").eq("id", task_id).execute().data
    if not task:
        raise HTTPException(status_code=404, detail="টাস্ক পাওয়া যায়নি!")
    return task[0]

# প্রুফ সাবমিশন (ImgBB-তে ছবি আপলোড সহ)
@router.post("/submit")
async def submit_task_proof(
    task_id: str = Form(...),
    user_id: str = Form(...),
    proof_image: UploadFile = File(...)
):
    file_bytes = await proof_image.read()
    image_url = await upload_to_imgbb(file_bytes, supabase)

    submission_data = {
        "task_id": task_id,
        "user_id": user_id,
        "proof_image": image_url,
        "status": "pending"
    }
    res = supabase.table("task_submissions").insert(submission_data).execute()
    return {"message": "টাস্ক সফলভাবে জমা দেওয়া হয়েছে!", "data": res.data}
