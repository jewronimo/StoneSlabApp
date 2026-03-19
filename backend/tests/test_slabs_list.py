from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Slab


def _make_slab(
    db: Session,
    *,
    slab_code: str,
    material_name: str = "Granite",
    finish: str = "Polished",
    height_value: float = 100.0,
    width_value: float = 50.0,
    thickness_value: float = 2.0,
    status: str = "available",
    porosity: bool = False,
    is_active: bool = True,
    item_description: str | None = None,
    customer_name: str | None = None,
    project_name: str | None = None,
) -> Slab:
    slab = Slab(
        slab_code=slab_code,
        material_name=material_name,
        finish=finish,
        height=str(height_value),
        height_value=height_value,
        width=str(width_value),
        width_value=width_value,
        thickness=str(thickness_value),
        thickness_value=thickness_value,
        warehouse_group="A1",
        status=status,
        customer_name=customer_name,
        project_name=project_name,
        item_description=item_description,
        porosity=porosity,
        is_active=is_active,
    )
    db.add(slab)
    db.flush()
    return slab


def _seed_slabs(db: Session) -> dict[str, str]:
    identity: dict[str, str] = {}

    for i in range(1, 26):
        slab = _make_slab(
            db,
            slab_code=f"S-{i:03d}",
            material_name="Granite",
            finish="Polished",
            height_value=90 + i,
            width_value=40 + i,
            thickness_value=1 + (i / 10),
            porosity=False,
            is_active=True,
            status="available",
            item_description=f"Base slab {i}",
            customer_name=f"Customer {i}",
            project_name=f"Project {i}",
        )
        identity[f"base_{i}"] = slab.slab_code

    identity["inactive"] = _make_slab(
        db,
        slab_code="S-900",
        material_name="Granite",
        finish="Polished",
        status="used",
        is_active=False,
        item_description="Inactive slab",
        customer_name="Inactive Customer",
        project_name="Inactive Project",
    ).slab_code

    identity["material_match"] = _make_slab(
        db,
        slab_code="S-901",
        material_name="Marble",
        finish="Honed",
        porosity=True,
        height_value=120.0,
        width_value=65.0,
        thickness_value=2.5,
        item_description="Blue ice veining",
        customer_name="Acme Stoneworks",
        project_name="Skyline Tower Lobby",
    ).slab_code

    _make_slab(
        db,
        slab_code="S-902",
        material_name="Quartz",
        finish="Leathered",
        porosity=False,
        height_value=80.0,
        width_value=35.0,
        thickness_value=1.5,
        item_description="Warm cloud texture",
        customer_name="Northstar Builders",
        project_name="River Walk Kitchen",
    )

    db.commit()
    return identity


def test_default_list_returns_newest_first_and_default_page_size_21(client, db_session: Session):
    _seed_slabs(db_session)

    response = client.get("/api/slabs")
    assert response.status_code == 200

    payload = response.json()

    assert payload["page"] == 1
    assert payload["page_size"] == 21
    assert payload["total"] == 27
    assert payload["total_pages"] == 2
    assert len(payload["items"]) == 21

    slab_codes = [item["slab_code"] for item in payload["items"]]
    assert slab_codes[0] == "S-902"
    assert slab_codes[-1] == "S-007"


def test_material_name_exact_match_filter(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"material_name": "marble"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]
    assert payload["items"][0]["material_name"] == "Marble"


def test_finish_exact_match_filter(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"finish": "honed"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]
    assert payload["items"][0]["finish"] == "Honed"


def test_porosity_filter_returns_only_porous_slabs(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"porosity": "true"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]
    assert all(item["porosity"] is True for item in payload["items"])


def test_item_description_partial_case_insensitive_filter(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"item_description": "BLUE ICE"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]


def test_customer_name_partial_case_insensitive_filter(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"customer_name": "acme"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]


def test_project_name_partial_case_insensitive_filter(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get("/api/slabs", params={"project_name": "tower"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]


def test_dimension_min_max_filters_use_numeric_value_fields(client, db_session: Session):
    identity = _seed_slabs(db_session)

    response = client.get(
        "/api/slabs",
        params={
            "min_height": 119,
            "max_height": 121,
            "min_width": 64,
            "max_width": 66,
            "min_thickness": 2.4,
            "max_thickness": 2.6,
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["material_match"]


def test_include_inactive_true_includes_inactive_slabs(client, db_session: Session):
    identity = _seed_slabs(db_session)

    default_response = client.get("/api/slabs", params={"status": "used"})
    assert default_response.status_code == 200
    assert default_response.json()["total"] == 0

    include_response = client.get(
        "/api/slabs",
        params={"status": "used", "include_inactive": "true"},
    )
    assert include_response.status_code == 200

    payload = include_response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["slab_code"] == identity["inactive"]


def test_pagination_metadata_and_page_navigation(client, db_session: Session):
    _seed_slabs(db_session)

    response = client.get(
        "/api/slabs",
        params={"include_inactive": "true", "page": 2},
    )
    assert response.status_code == 200

    payload = response.json()
    assert set(payload.keys()) == {"items", "page", "page_size", "total", "total_pages"}
    assert payload["page"] == 2
    assert payload["page_size"] == 21
    assert payload["total"] == 28
    assert payload["total_pages"] == 2
    assert len(payload["items"]) == 7

    slab_codes = [item["slab_code"] for item in payload["items"]]
    assert slab_codes == [
        "S-007",
        "S-006",
        "S-005",
        "S-004",
        "S-003",
        "S-002",
        "S-001",
    ]
