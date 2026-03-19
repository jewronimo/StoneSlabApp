from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    AUTH_SECRET_KEY,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_GUEST_PASSWORD,
    DEFAULT_GUEST_USERNAME,
)
from app.db import get_db
from app.models import User

ROLE_ADMIN = "admin"
ROLE_WAREHOUSE_USER = "warehouse_user"
ROLE_GUEST = "guest"
ALLOWED_ROLES = {ROLE_ADMIN, ROLE_WAREHOUSE_USER, ROLE_GUEST}

security = HTTPBearer(auto_error=False)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str, *, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        120_000,
    )
    return f"{salt_value}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, expected_hex = stored_hash.split("$", 1)
    except ValueError:
        return False

    candidate = hash_password(password, salt=salt)
    return hmac.compare_digest(candidate, f"{salt}${expected_hex}")


def create_access_token(*, username: str, role: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": username,
        "role": role,
        "exp": int(expires_at.timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    encoded_payload = _b64url_encode(payload_bytes)
    signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_payload}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc

    expected_signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    provided_signature = _b64url_decode(encoded_signature)

    if not hmac.compare_digest(expected_signature, provided_signature):
        raise HTTPException(status_code=401, detail="Invalid auth token signature")

    try:
        payload = json.loads(_b64url_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token payload") from exc

    exp = payload.get("exp")
    if not isinstance(exp, int) or datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=401, detail="Auth token has expired")

    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_access_token(credentials.credentials)
    username = payload.get("sub")
    role = payload.get("role")

    if not username or role not in ALLOWED_ROLES:
        raise HTTPException(status_code=401, detail="Invalid auth token claims")

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User is not active")

    if user.role != role:
        raise HTTPException(status_code=401, detail="Auth token role mismatch")

    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    allowed = set(roles)

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _guard


def ensure_seed_users(db: Session) -> None:
    default_users = [
        (DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, ROLE_ADMIN),
        (DEFAULT_GUEST_USERNAME, DEFAULT_GUEST_PASSWORD, ROLE_GUEST),
    ]

    created_any = False
    for username, password, role in default_users:
        user = db.query(User).filter(User.username == username).first()
        if user:
            if user.role != role:
                user.role = role
                created_any = True
            if not user.is_active:
                user.is_active = True
                created_any = True
            continue

        db.add(
            User(
                username=username,
                password_hash=hash_password(password),
                role=role,
                is_active=True,
            )
        )
        created_any = True

    if created_any:
        db.commit()
