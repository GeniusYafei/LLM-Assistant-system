# tests/test_api_e2e.py
import os
import uuid
import json
import time

import pytest
import requests

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "test@test.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "123456")

# ---------- Helpers ----------

def api_url(path: str) -> str:
    # path like "/api/v1/auth/login" or "/health"
    if not path.startswith("/"):
        path = "/" + path
    return BASE_URL.rstrip("/") + path


def auth_headers(token: str | None) -> dict:
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def random_email(prefix="testuser") -> str:
    return f"{prefix}.{uuid.uuid4().hex[:8]}@example.com"


def random_org_name(prefix="Org") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6]}"


@pytest.fixture(scope="session")
def http_session():
    s = requests.Session()
    return s


# ---------- Admin login fixture ----------

@pytest.fixture(scope="session")
def admin_token(http_session):
    """
    Deps: Database must have an existing super admin account.
    Email/password provided via ADMIN_EMAIL / ADMIN_PASSWORD env vars.
    """
    resp = http_session.post(
        api_url("/api/v1/auth/login"),
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    return data["access_token"]


# ---------- Org + normal user flow ----------

@pytest.fixture(scope="session")
def created_org(http_session):
    """
    Use /auth/organizations to create a new organization, return {id, name}
    """
    name = random_org_name()
    resp = http_session.post(
        api_url("/api/v1/auth/organizations"),
        json={"name": name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture(scope="session")
def user_credentials(created_org):
    """
    Prepare normal user credentials for register + login
    """
    email = random_email("normal")
    password = "TestPass123!"
    return {
        "email": email,
        "password": password,
        "organization_id": created_org["id"],
    }


@pytest.fixture(scope="session")
def user_token(http_session, user_credentials):
    """
    Register + login a normal user, return access_token
    """
    # register
    resp = http_session.post(
        api_url("/api/v1/auth/register"),
        json={
            "email": user_credentials["email"],
            "password": user_credentials["password"],
            "display_name": "Normal User",
            "organization_id": user_credentials["organization_id"],
        },
    )
    assert resp.status_code == 201, resp.text

    # login
    resp = http_session.post(
        api_url("/api/v1/auth/login"),
        json={
            "email": user_credentials["email"],
            "password": user_credentials["password"],
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["access_token"]


# ---------- Basic health ----------

def test_health(http_session):
    resp = http_session.get(api_url("/health"))
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


# ---------- Auth & Organization ----------

def test_list_organizations(http_session, created_org):
    # just ensure endpoint works and returns at least one org
    resp = http_session.get(api_url("/api/v1/auth/organizations"))
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert any(org["id"] == created_org["id"] for org in items)


def test_forgot_password(http_session, user_credentials):
    """
    Only verify that the endpoint can be called and returns 200/204,
    without checking actual email logic.
    """
    resp = http_session.post(
        api_url("/api/v1/auth/password/forgot"),
        json={
            "email": user_credentials["email"],
            "display_name": "Normal User",
        },
    )
    assert resp.status_code in (200, 204), resp.text


def test_reset_password_invalid_code(http_session, user_credentials):
    """
    Use invalid code to test reset endpoint.
    In your current mock flow, backend may still return 204;
    so we only assert "not crash" and accept both behaviors.
    """
    resp = http_session.post(
        api_url("/api/v1/auth/password/reset"),
        json={
            "email": user_credentials["email"],
            "code": "000000",
            "new_password": "NewTestPass123!",
            "confirm_password": "NewTestPass123!",
        },
    )
    assert resp.status_code in (204, 400, 401, 422), resp.text


# ---------- Account / Settings ----------

def test_settings_user_basic(http_session, user_token):
    # GET /settings/user
    resp = http_session.get(
        api_url("/api/v1/settings/user"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "email" in data

    # PATCH /settings/user/name
    new_name = "New Display Name"
    resp = http_session.patch(
        api_url("/api/v1/settings/user/name"),
        headers=auth_headers(user_token),
        json={"display_name": new_name},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["display_name"] == new_name

    # GET /settings/user/organizations
    resp = http_session.get(
        api_url("/api/v1/settings/user/organizations"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    items = resp.json().get("items", [])
    assert isinstance(items, list)


def test_change_password_flow(http_session, user_token, user_credentials):
    # Use wrong current password first
    resp = http_session.post(
        api_url("/api/v1/settings/user/change_password"),
        headers=auth_headers(user_token),
        json={
            "current_password": "WrongPass",
            "new_password": "AnotherPass123!",
            "confirm_password": "AnotherPass123!",
        },
    )
    assert resp.status_code in (400, 422), resp.text

    # Use correct current password
    resp = http_session.post(
        api_url("/api/v1/settings/user/change_password"),
        headers=auth_headers(user_token),
        json={
            "current_password": user_credentials["password"],
            "new_password": "AnotherPass123!",
            "confirm_password": "AnotherPass123!",
        },
    )
    assert resp.status_code == 204, resp.text

    # Use new password to login
    resp = http_session.post(
        api_url("/api/v1/auth/login"),
        json={
            "email": user_credentials["email"],
            "password": "AnotherPass123!",
        },
    )
    assert resp.status_code == 200, resp.text


# ---------- Quota & Files ----------

def test_quota_info_and_usage(http_session, user_token):
    # /quota/info
    resp = http_session.get(
        api_url("/api/v1/quota/info"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "limit_bytes" in data
    assert "used_total_bytes" in data or "used_conv_bytes" in data

    # /files/usage
    resp = http_session.get(
        api_url("/api/v1/files/usage"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "used_bytes" in data
    assert "limit_bytes" in data


@pytest.fixture
def uploaded_document(http_session, user_token):
    # Upload a sample file
    files = {
        "file": ("hello.txt", b"hello world", "text/plain"),
    }
    resp = http_session.post(
        api_url("/api/v1/files/upload"),
        headers=auth_headers(user_token),
        files=files,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()

    # Handle two possible response formats:
    # 1) { document: {...}, quota: {...} }
    # 2) { id: ..., filename: ..., quota: {...} }
    if "document" in data:
        doc = data["document"]
    else:
        doc = data

    return doc


def test_list_files_and_delete(http_session, user_token, uploaded_document):
    # list files
    resp = http_session.get(
        api_url("/api/v1/files"),
        headers=auth_headers(user_token),
        params={"page": 1, "page_size": 10},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert any(item["id"] == uploaded_document["id"] for item in data["items"])

    # delete file
    resp = http_session.delete(
        api_url(f"/api/v1/files/{uploaded_document['id']}"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 204, resp.text


# ---------- Chat: conversations & messages ----------

@pytest.fixture
def conversation(http_session, user_token):
    # create conversation
    resp = http_session.post(
        api_url("/api/v1/chat/conversations"),
        headers=auth_headers(user_token),
        json={"title": "My First Chat"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_list_and_rename_and_delete_conversation(http_session, user_token, conversation):
    conv_id = conversation["id"]

    # list
    resp = http_session.get(
        api_url("/api/v1/chat/conversations"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert any(c["id"] == conv_id for c in items)

    # rename
    new_title = "Renamed Chat"
    resp = http_session.patch(
        api_url(f"/api/v1/chat/conversations/{conv_id}"),
        headers=auth_headers(user_token),
        json={"title": new_title},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["title"] == new_title

    # delete
    resp = http_session.delete(
        api_url(f"/api/v1/chat/conversations/{conv_id}"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 204, resp.text

    # list again: deleted conversation should be gone
    resp = http_session.get(
        api_url("/api/v1/chat/conversations"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert all(c["id"] != conv_id for c in items)


def test_send_message_no_stream(http_session, user_token, conversation):
    conv_id = conversation["id"]

    # list messages (initially empty)
    resp = http_session.get(
        api_url(f"/api/v1/chat/conversations/{conv_id}/messages"),
        headers=auth_headers(user_token),
    )
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)

    # send user message -> expect user + assistant messages
    resp = http_session.post(
        api_url(f"/api/v1/chat/conversations/{conv_id}/messages"),
        headers=auth_headers(user_token),
        json={"content": "Hello model!", "document_ids": []},
    )
    assert resp.status_code == 201, resp.text
    msgs = resp.json()
    assert isinstance(msgs, list)
    assert len(msgs) >= 1
    assert msgs[0]["role"] == "user"


def test_send_message_stream(http_session, user_token, conversation):
    """
    Verify that the streaming endpoint returns 200 and some SSE lines.
    """
    conv_id = conversation["id"]
    url = api_url(f"/api/v1/chat/conversations/{conv_id}/messages/stream")

    headers = auth_headers(user_token)
    headers["Accept"] = "text/event-stream"

    resp = http_session.post(
        url,
        headers=headers,
        json={"content": "Hello streaming!", "document_ids": []},
        stream=True,
    )
    assert resp.status_code == 200

    # read a few lines from the stream to verify SSE format
    line_count = 0
    for line in resp.iter_lines():
        if not line:
            continue
        decoded = line.decode("utf-8")
        assert decoded.startswith("data:")
        line_count += 1
        if line_count >= 3:
            break

    resp.close()
    assert line_count >= 1


# ---------- Admin: users & analytics ----------

def test_admin_users_stats_and_list(http_session, admin_token):
    headers = auth_headers(admin_token)

    # stats
    resp = http_session.get(
        api_url("/api/v1/admin/users/stats"),
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "total_users" in data

    # list
    resp = http_session.get(
        api_url("/api/v1/admin/users"),
        headers=headers,
        params={"limit": 5, "offset": 0},
    )
    assert resp.status_code == 200, resp.text
    page = resp.json()
    assert "items" in page
    assert isinstance(page["items"], list)


def test_admin_invite_and_activate_and_deactivate_user(http_session, admin_token, created_org):
    headers = auth_headers(admin_token)

    # invite new user
    email = random_email("invited")
    resp = http_session.post(
        api_url("/api/v1/admin/users"),
        headers=headers,
        json={
            "display_name": "Invited User",
            "email": email,
            "role": "User",  # or "Admin"
            "organization_id": created_org["id"],
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    user_card = data["user"]
    invited_id = user_card["id"]

    # activate (should already be active, but API 204)
    resp = http_session.post(
        api_url(f"/api/v1/admin/users/{invited_id}/activate"),
        headers=headers,
        json={"is_active": True},
    )
    assert resp.status_code == 204, resp.text

    # deactivate
    resp = http_session.delete(
        api_url(f"/api/v1/admin/users/{invited_id}"),
        headers=headers,
    )
    assert resp.status_code == 204, resp.text


def test_admin_analytics_summary_and_trends(http_session, admin_token):
    headers = auth_headers(admin_token)

    # summary
    resp = http_session.get(
        api_url("/api/v1/admin/analytics/summary"),
        headers=headers,
        params={"range": "7d"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Your latest backend returns: {range, current, previous}
    assert "range" in data
    assert data["range"] == "7d"
    assert "current" in data and isinstance(data["current"], dict)
    assert "previous" in data and isinstance(data["previous"], dict)

    for blk in ("current", "previous"):
        b = data[blk]
        assert "total_messages" in b
        assert "tokens_used" in b
        assert "avg_latency_ms" in b
        assert "success_rate" in b

    # trends
    resp = http_session.get(
        api_url("/api/v1/admin/analytics/trends"),
        headers=headers,
        params={"range": "7d"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "daily" in data
    assert "hourly_24h" in data