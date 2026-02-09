from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base, SessionLocal
from app.routes import all_routers
from app.models import User, DailyCard, Halqa, SiteSettings
from app.config import settings as app_settings

app = FastAPI(title="Ramadan Program Management API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handler: map {"detail": ...} to {"error": ...} for frontend compatibility
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


# Include all routers
for router in all_routers:
    app.include_router(router)


# Startup: create tables and default settings
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if not db.query(SiteSettings).first():
            db.add(SiteSettings(enable_email_notifications=True))
            db.commit()

        # Auto-create super admin if not exists
        admin_email = app_settings.SUPER_ADMIN_EMAIL.lower()
        admin = db.query(User).filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                full_name="Super Admin",
                gender="male",
                age=30,
                phone="0000000000",
                email=admin_email,
                country="--",
                status="active",
                role="super_admin",
            )
            admin.set_password(app_settings.SUPER_ADMIN_PASSWORD)
            db.add(admin)
            db.commit()
            print(f"Super admin created: {admin_email}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
