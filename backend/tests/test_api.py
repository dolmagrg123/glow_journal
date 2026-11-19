def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_and_login(client, new_user):
    r = client.post("/api/v1/auth/register", json=new_user)
    assert r.status_code == 201
    assert r.json()["username"] == new_user["username"]

    r = client.post(
        "/api/v1/auth/login",
        json={"email": new_user["email"], "password": new_user["password"]},
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_wrong_password(client, new_user):
    client.post("/api/v1/auth/register", json=new_user)
    r = client.post(
        "/api/v1/auth/login",
        json={"email": new_user["email"], "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_duplicate_email_rejected(client, new_user):
    assert client.post("/api/v1/auth/register", json=new_user).status_code == 201
    again = {**new_user, "username": new_user["username"] + "x"}
    assert client.post("/api/v1/auth/register", json=again).status_code == 400


def test_me_requires_token(client):
    assert client.get("/api/v1/users/me").status_code in (401, 403)


def test_me_with_token(client, new_user):
    token = client.post("/api/v1/auth/register", json=new_user).json()["access_token"]
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == new_user["username"]
