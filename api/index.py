from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import auth, tasks, withdraw, admin

app = FastAPI(title="MicroEarnX Backend API")

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# রাউটারসমূহ কানেক্ট করা
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(withdraw.router)
app.include_router(admin.router)

@app.get("/")
def home():
    return {"status": "MicroEarnX API is running successfully!"}
