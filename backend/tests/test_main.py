from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_categories():
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_posts():
    response = client.get("/api/posts")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


def test_register_and_login():
    import random
    uid = random.randint(10000, 99999)
    # Register
    reg_res = client.post("/api/users/register", json={
        "username": f"testuser_{uid}",
        "email": f"test_{uid}@test.com",
        "nickname": f"테스터{uid}",
        "password": "testpassword123",
    })
    assert reg_res.status_code == 201

    # Login
    login_res = client.post("/api/users/login", json={
        "username": f"testuser_{uid}",
        "password": "testpassword123",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
