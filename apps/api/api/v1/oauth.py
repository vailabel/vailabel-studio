from services.auth_service import oauth
from fastapi import APIRouter
from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db.models.user import User
from services.auth_service import create_access_token, get_user_by_email
from fastapi.responses import RedirectResponse

social_router = APIRouter(tags=["SocialAuth"], prefix="/api/v1/auth/social")


@social_router.get("/login/{provider}")
async def social_login(request: Request, provider: str):
    redirect_uri = str(request.url_for("social_auth_callback", provider=provider))
    return await oauth.create_client(provider).authorize_redirect(request, redirect_uri)


@social_router.get("/callback/{provider}")
async def social_auth_callback(
    request: Request, provider: str, db: Session = Depends(get_db)
):
    token = await oauth.create_client(provider).authorize_access_token(request)
    if provider == "github":
        user_info = await oauth.github.get("user", token=token)
        user_data = user_info.json()
        email = user_data.get("email")
        if not email:
            # Fetch primary email if not public
            emails_resp = await oauth.github.get("user/emails", token=token)
            emails = emails_resp.json()
            for e in emails:
                if e.get("primary"):
                    email = e.get("email")
                    break
        name = user_data.get("name") or user_data.get("login")
    elif provider == "google":
        user_info = await oauth.google.get("userinfo", token=token)
        user_data = user_info.json()
        email = user_data.get("email")
        name = user_data.get("name")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Find or create user
    user = get_user_by_email(db, email)
    if not user:
        user = User(email=email, name=name, role="user")
        db.add(user)
        db.commit()
        db.refresh(user)
    access_token = create_access_token(data={"sub": user.email})
    # Redirect or return token
    return {"access_token": access_token, "token_type": "bearer"}
