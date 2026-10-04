import httpx
from supabase import Client

async def upload_to_imgbb(file_bytes: bytes, supabase: Client) -> str:
    keys = supabase.table("imgbb_keys").select("*").eq("is_active", True).execute().data
    if not keys:
        raise Exception("কোনো সক্রিয় ImgBB Key পাওয়া যায়নি!")

    async with httpx.AsyncClient() as client:
        for key_obj in keys:
            try:
                res = await client.post(
                    "https://api.imgbb.com/1/upload",
                    params={"key": key_obj["api_key"]},
                    files={"image": file_bytes},
                    timeout=15.0
                )
                if res.status_code == 200:
                    return res.json()["data"]["url"]
                else:
                    # ফেইল কাউন্ট বাড়ানো
                    supabase.table("imgbb_keys").update({"failed_count": key_obj["failed_count"] + 1}).eq("id", key_obj["id"]).execute()
            except Exception:
                continue
                
    raise Exception("সকল ImgBB API Key লিমিট শেষ অথবা কাজ করছে না!")
