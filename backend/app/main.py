from pathlib import Path
import re
from shutil import copyfileobj, rmtree
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.db import check_db_connection, engine, get_db
from app.models import Base, Slab
from app.schemas import SlabResponse

from io import BytesIO
from PIL import Image, ImageOps


app = FastAPI(title="Stone Slab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.119:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
MEDIA_ROOT = PROJECT_ROOT / "storage"
SLAB_IMAGES_ROOT = MEDIA_ROOT / "slabs"

MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
SLAB_IMAGES_ROOT.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

ALLOWED_STATUSES = {"available", "reserved", "used"}
ALLOWED_FINISHES = {
    "Flamed",
    "Brushed",
    "Polished",
    "Honed",
    "Leathered",
    "Sandblasted",
}
ALLOWED_MATERIALS = {
    "Granite",
    "Marble",
    "Quartz",
    "Travertine",
    "Onyx",
    "Limestone",
    "Quartzite",
    "Misc",
}


def generate_slab_code(db: Session) -> str:
    slab_codes = db.query(Slab.slab_code).all()

    used_numbers = set()

    for (slab_code,) in slab_codes:
        if not slab_code:
            continue

        match = re.fullmatch(r"S-(\d+)", slab_code)
        if match:
            used_numbers.add(int(match.group(1)))

    next_number = 1
    while next_number in used_numbers:
        next_number += 1

    return f"S-{next_number}"


def generate_match_group_code() -> str:
    return f"MATCH-{uuid4().hex[:12].upper()}"


def clean_required_text(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    return cleaned


def clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None


def validate_dimension_text(value: str, field_name: str) -> str:
    cleaned = value.strip()

    pattern = r"^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+/\d+|\d+/\d+)$"
    if not re.fullmatch(pattern, cleaned):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{field_name} must be inches only, using numbers only. "
                "Examples: 120, 54, 0.75, 3/4, 126 1/8"
            ),
        )

    return cleaned


def validate_warehouse_group(value: str) -> str:
    cleaned = value.strip().upper()

    if not re.fullmatch(r"^[A-Z][1-5]$", cleaned):
        raise HTTPException(
            status_code=400,
            detail="warehouse_group must be in format A1 to Z5",
        )

    return cleaned


def validate_slab_rules(
    *,
    finish_raw: str,
    warehouse_group_raw: str,
    status_raw: str,
    customer_name: str | None,
    project_name: str | None,
):
    status = status_raw.strip().lower()
    if status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
        )

    finish_lookup = {f.lower(): f for f in ALLOWED_FINISHES}
    finish = finish_lookup.get(finish_raw.strip().lower())
    if not finish:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid finish. Allowed: {sorted(ALLOWED_FINISHES)}",
        )

    warehouse_group = validate_warehouse_group(warehouse_group_raw)

    if status == "reserved" and (not customer_name or not project_name):
        raise HTTPException(
            status_code=400,
            detail="Reserved slabs require customer_name and project_name",
        )

    return status, finish, warehouse_group


def normalize_match_group_code(value: str | None) -> str | None:
    cleaned = clean_optional_text(value)
    return cleaned.upper() if cleaned else None


def parse_dimension_to_number(value: str | None) -> float | None:
    if not value:
        return None

    cleaned = value.strip()

    mixed_fraction_match = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$", cleaned)
    if mixed_fraction_match:
        whole = float(mixed_fraction_match.group(1))
        numerator = float(mixed_fraction_match.group(2))
        denominator = float(mixed_fraction_match.group(3))
        if denominator != 0:
            return whole + numerator / denominator

    fraction_match = re.match(r"^(\d+)\/(\d+)$", cleaned)
    if fraction_match:
        numerator = float(fraction_match.group(1))
        denominator = float(fraction_match.group(2))
        if denominator != 0:
            return numerator / denominator

    decimal_match = re.match(r"^(?:\d+(?:\.\d+)?|\.\d+)$", cleaned)
    if decimal_match:
        return float(cleaned)

    return None

def parse_required_dimension_value(value: str, field_name: str) -> float:
    parsed = parse_dimension_to_number(value)
    if parsed is None:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} could not be converted to numeric value",
        )
    return parsed



def format_dimension_for_filename(value: str | None) -> str:
    number = parse_dimension_to_number(value)
    if number is None:
        return "unknown"
    return f"{number:.3f}".rstrip("0").rstrip(".")


def build_slab_image_filename(slab: Slab, original_filename: str) -> str:
    extension = Path(original_filename).suffix.lower() or ".jpg"
    code_part = slab.slab_code.lower().replace("-", "")
    height_part = format_dimension_for_filename(slab.height)
    width_part = format_dimension_for_filename(slab.width)
    thickness_part = format_dimension_for_filename(slab.thickness)

    return f"{code_part}({height_part}x{width_part}x{thickness_part}){extension}"


def cleanup_match_group_if_needed(db: Session, match_group_code: str | None) -> None:
    if not match_group_code:
        return

    grouped_slabs = (
        db.query(Slab)
        .filter(Slab.match_group_code == match_group_code)
        .all()
    )

    active_count = sum(1 for item in grouped_slabs if item.is_active)

    if active_count < 2:
        for item in grouped_slabs:
            item.match_group_code = None


def save_slab_image(slab: Slab, image: UploadFile) -> None:
    if not image.filename:
        raise HTTPException(status_code=400, detail="Image filename is missing")

    content_type = image.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    slab_dir = SLAB_IMAGES_ROOT / str(slab.id)
    slab_dir.mkdir(parents=True, exist_ok=True)

    for existing_file in slab_dir.iterdir():
        if existing_file.is_file():
            existing_file.unlink()

    stored_filename = build_slab_image_filename(slab, image.filename)
    destination = slab_dir / stored_filename

    image_bytes = image.file.read()

    with Image.open(BytesIO(image_bytes)) as pil_image:
        corrected = ImageOps.exif_transpose(pil_image)

        save_format = corrected.format or pil_image.format or "JPEG"
        if save_format.upper() == "JPG":
            save_format = "JPEG"

        corrected.save(destination, format=save_format)

    slab.image_filename = stored_filename
    slab.image_content_type = content_type


def build_image_url(request: Request, slab: Slab) -> str | None:
    if not slab.image_filename:
        return None

    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/media/slabs/{slab.id}/{slab.image_filename}"


def serialize_slab(slab: Slab, request: Request) -> dict:
    return {
        "id": slab.id,
        "slab_code": slab.slab_code,
        "material_name": slab.material_name,
        "finish": slab.finish,
        "height": slab.height,
        "height_value": float(slab.height_value) if slab.height_value is not None else None,
        "width": slab.width,
        "width_value": float(slab.width_value) if slab.width_value is not None else None,
        "thickness": slab.thickness,
        "thickness_value": slab.thickness_value,
        "warehouse_group": slab.warehouse_group,
        "status": slab.status,
        "customer_name": slab.customer_name,
        "project_name": slab.project_name,
        "item_description": slab.item_description,
        "porosity": slab.porosity,
        "is_active": slab.is_active,
        "created_at": slab.created_at,
        "updated_at": slab.updated_at,
        "image_url": build_image_url(request, slab),
        "match_group_code": slab.match_group_code,
    }

def ensure_dimension_numeric_columns() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("slabs"):
        return

    columns = {column["name"] for column in inspector.get_columns("slabs")}
    with engine.begin() as conn:
        if "height_value" not in columns:
            conn.execute(text("ALTER TABLE slabs ADD COLUMN height_value FLOAT"))
            conn.execute(text("UPDATE slabs SET height_value = 0 WHERE height_value IS NULL"))
            conn.execute(text("ALTER TABLE slabs ALTER COLUMN height_value SET NOT NULL"))
        if "width_value" not in columns:
            conn.execute(text("ALTER TABLE slabs ADD COLUMN width_value FLOAT"))
            conn.execute(text("UPDATE slabs SET width_value = 0 WHERE width_value IS NULL"))
            conn.execute(text("ALTER TABLE slabs ALTER COLUMN width_value SET NOT NULL"))
        if "thickness_value" not in columns:
            conn.execute(text("ALTER TABLE slabs ADD COLUMN thickness_value FLOAT"))
            conn.execute(text("UPDATE slabs SET thickness_value = 0 WHERE thickness_value IS NULL"))
            conn.execute(text("ALTER TABLE slabs ALTER COLUMN thickness_value SET NOT NULL"))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_dimension_numeric_columns()


@app.get("/")
def root():
    return {"message": "Stone Slab API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def db_check():
    result = check_db_connection()
    return {"db_connected": result == 1}


@app.get("/finish-options")
def finish_options():
    return {"finishes": sorted(ALLOWED_FINISHES)}


@app.get("/material-options")
def get_material_options():
    return {"materials": sorted(ALLOWED_MATERIALS)}


@app.get("/status-options")
def get_status_options():
    return {"statuses": sorted(ALLOWED_STATUSES)}


@app.post("/slabs/matched", response_model=SlabResponse)
def create_matched_slab(
    request: Request,
    previous_slab_code: str = Form(...),
    material_name: str = Form(...),
    finish: str = Form(...),
    height: str = Form(...),
    width: str = Form(...),
    thickness: str = Form(...),
    warehouse_group: str = Form(...),
    status: str = Form("available"),
    customer_name: str | None = Form(None),
    project_name: str | None = Form(None),
    item_description: str | None = Form(None),
    porosity: bool = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    previous_slab_code_clean = clean_required_text(
        previous_slab_code, "previous_slab_code"
    )

    previous_slab = (
        db.query(Slab).filter(Slab.slab_code == previous_slab_code_clean).first()
    )
    if not previous_slab:
        raise HTTPException(status_code=404, detail="Previous slab not found")

    material_name_clean = clean_required_text(material_name, "material_name")
    height_clean = validate_dimension_text(height, "height")
    width_clean = validate_dimension_text(width, "width")
    thickness_clean = validate_dimension_text(thickness, "thickness")

    height_value = parse_required_dimension_value(height_clean, "height")
    width_value = parse_required_dimension_value(width_clean, "width")
    thickness_value = parse_required_dimension_value(thickness_clean, "thickness")

    customer_name_clean = clean_optional_text(customer_name)
    project_name_clean = clean_optional_text(project_name)
    item_description_clean = clean_optional_text(item_description)

    status_clean, finish_clean, warehouse_group_clean = validate_slab_rules(
        finish_raw=finish,
        warehouse_group_raw=warehouse_group,
        status_raw=status,
        customer_name=customer_name_clean,
        project_name=project_name_clean,
    )

    match_group_code = previous_slab.match_group_code or generate_match_group_code()
    previous_slab.match_group_code = match_group_code

    slab = Slab(
        slab_code=generate_slab_code(db),
        material_name=material_name_clean,
        finish=finish_clean,
        height=height_clean,
        height_value=height_value,
        width=width_clean,
        width_value=width_value,
        thickness=thickness_clean,
        thickness_value=thickness_value,
        warehouse_group=warehouse_group_clean,
        status=status_clean,
        customer_name=customer_name_clean,
        project_name=project_name_clean,
        item_description=item_description_clean,
        porosity=porosity,
        is_active=(status_clean != "used"),
        match_group_code=match_group_code,
    )

    db.add(slab)
    db.flush()

    save_slab_image(slab, image)

    db.commit()
    db.refresh(slab)

    return serialize_slab(slab, request)


@app.post("/slabs", response_model=SlabResponse)
def create_slab(
    request: Request,
    material_name: str = Form(...),
    finish: str = Form(...),
    height: str = Form(...),
    width: str = Form(...),
    thickness: str = Form(...),
    warehouse_group: str = Form(...),
    status: str = Form("available"),
    customer_name: str | None = Form(None),
    project_name: str | None = Form(None),
    item_description: str | None = Form(None),
    porosity: bool = Form(...),
    match_group_code: str | None = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    material_name_clean = clean_required_text(material_name, "material_name")
    height_clean = validate_dimension_text(height, "height")
    width_clean = validate_dimension_text(width, "width")
    thickness_clean = validate_dimension_text(thickness, "thickness")

    height_value = parse_required_dimension_value(height_clean, "height")
    width_value = parse_required_dimension_value(width_clean, "width")
    thickness_value = parse_required_dimension_value(thickness_clean, "thickness")


    customer_name_clean = clean_optional_text(customer_name)
    project_name_clean = clean_optional_text(project_name)
    item_description_clean = clean_optional_text(item_description)

    status_clean, finish_clean, warehouse_group_clean = validate_slab_rules(
        finish_raw=finish,
        warehouse_group_raw=warehouse_group,
        status_raw=status,
        customer_name=customer_name_clean,
        project_name=project_name_clean,
    )

    slab = Slab(
        slab_code=generate_slab_code(db),
        material_name=material_name_clean,
        finish=finish_clean,
        height=height_clean,
        height_value=height_value,
        width=width_clean,
        width_value=width_value,
        thickness=thickness_clean,
        thickness_value=thickness_value,
        warehouse_group=warehouse_group_clean,
        status=status_clean,
        customer_name=customer_name_clean,
        project_name=project_name_clean,
        item_description=item_description_clean,
        porosity=porosity,
        is_active=(status_clean != "used"),
        match_group_code=normalize_match_group_code(match_group_code),
    )

    db.add(slab)
    db.flush()

    save_slab_image(slab, image)

    db.commit()
    db.refresh(slab)
    return serialize_slab(slab, request)


@app.get("/slabs", response_model=list[SlabResponse])
def list_slabs(
    request: Request,
    include_inactive: bool = False,
    status: str | None = None,
    warehouse_group: str | None = None,
    min_height: float | None = None,
    max_height: float | None = None,
    min_width: float | None = None,
    max_width: float | None = None,
    min_thickness: float | None = None,
    max_thickness: float | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Slab)

    if not include_inactive:
        query = query.filter(Slab.is_active.is_(True))

    if status:
        status_clean = status.lower().strip()
        if status_clean not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
            )
        query = query.filter(Slab.status == status_clean)

    if warehouse_group:
        warehouse_group_clean = validate_warehouse_group(warehouse_group)
        query = query.filter(Slab.warehouse_group == warehouse_group_clean)

    if min_height is not None:
        query = query.filter(Slab.height_value >= min_height)
    if max_height is not None:
        query = query.filter(Slab.height_value <= max_height)

    if min_width is not None:
        query = query.filter(Slab.width_value >= min_width)
    if max_width is not None:
        query = query.filter(Slab.width_value <= max_width)

    if min_thickness is not None:
        query = query.filter(Slab.thickness_value >= min_thickness)
    if max_thickness is not None:
        query = query.filter(Slab.thickness_value <= max_thickness)

    is_default_load = (
        include_inactive is False
        and status is None
        and warehouse_group is None
        and min_height is None
        and max_height is None
        and min_width is None
        and max_width is None
        and min_thickness is None
        and max_thickness is None
    )

    if is_default_load:
        slabs = query.order_by(Slab.id.desc()).limit(20).all()
    else:
        slabs = query.order_by(Slab.id.desc()).all()

    return [serialize_slab(slab, request) for slab in slabs]

@app.delete("/slabs/{slab_code}")
def delete_slab(slab_code: str, db: Session = Depends(get_db)):
    slab = db.query(Slab).filter(Slab.slab_code == slab_code).first()
    if not slab:
        raise HTTPException(status_code=404, detail="Slab not found")

    slab_id = slab.id
    match_group_code = slab.match_group_code

    db.delete(slab)
    db.flush()

    cleanup_match_group_if_needed(db, match_group_code)

    db.commit()

    slab_dir = SLAB_IMAGES_ROOT / str(slab_id)
    if slab_dir.exists():
        rmtree(slab_dir, ignore_errors=True)

    return {"message": "Slab deleted"}


@app.get("/slabs/{slab_code}", response_model=SlabResponse)
def get_slab(slab_code: str, request: Request, db: Session = Depends(get_db)):
    slab = db.query(Slab).filter(Slab.slab_code == slab_code).first()
    if not slab:
        raise HTTPException(status_code=404, detail="Slab not found")
    return serialize_slab(slab, request)


@app.get("/slabs/{slab_code}/matches", response_model=list[SlabResponse])
def get_slab_matches(
    slab_code: str,
    request: Request,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    slab = db.query(Slab).filter(Slab.slab_code == slab_code).first()
    if not slab:
        raise HTTPException(status_code=404, detail="Slab not found")

    if not slab.match_group_code:
        return []

    query = db.query(Slab).filter(
        Slab.match_group_code == slab.match_group_code,
        Slab.slab_code != slab.slab_code,
    )

    if not include_inactive:
        query = query.filter(Slab.is_active.is_(True))

    matched_slabs = query.order_by(Slab.id.asc()).all()
    return [serialize_slab(item, request) for item in matched_slabs]


@app.get("/slabs/{slab_code}/image/download")
def download_slab_image(slab_code: str, db: Session = Depends(get_db)):
    slab = db.query(Slab).filter(Slab.slab_code == slab_code).first()
    if not slab:
        raise HTTPException(status_code=404, detail="Slab not found")

    if not slab.image_filename:
        raise HTTPException(status_code=404, detail="Slab image not found")

    image_path = SLAB_IMAGES_ROOT / str(slab.id) / slab.image_filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Slab image file not found")

    download_name = slab.image_filename or f"{slab.slab_code}{image_path.suffix}"

    return FileResponse(
        path=image_path,
        media_type=slab.image_content_type or "application/octet-stream",
        filename=download_name,
    )


@app.put("/slabs/{slab_code}", response_model=SlabResponse)
def update_slab(
    slab_code: str,
    request: Request,
    material_name: str = Form(...),
    finish: str = Form(...),
    height: str = Form(...),
    width: str = Form(...),
    thickness: str = Form(...),
    warehouse_group: str = Form(...),
    status: str = Form(...),
    customer_name: str | None = Form(None),
    project_name: str | None = Form(None),
    item_description: str | None = Form(None),
    porosity: bool = Form(...),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    slab = db.query(Slab).filter(Slab.slab_code == slab_code).first()
    if not slab:
        raise HTTPException(status_code=404, detail="Slab not found")

    existing_match_group_code = slab.match_group_code

    material_name_clean = clean_required_text(material_name, "material_name")
    height_clean = validate_dimension_text(height, "height")
    width_clean = validate_dimension_text(width, "width")
    thickness_clean = validate_dimension_text(thickness, "thickness")

    height_value = parse_required_dimension_value(height_clean, "height")
    width_value = parse_required_dimension_value(width_clean, "width")
    thickness_value = parse_required_dimension_value(thickness_clean, "thickness")

    customer_name_clean = clean_optional_text(customer_name)
    project_name_clean = clean_optional_text(project_name)
    item_description_clean = clean_optional_text(item_description)

    status_clean, finish_clean, warehouse_group_clean = validate_slab_rules(
        finish_raw=finish,
        warehouse_group_raw=warehouse_group,
        status_raw=status,
        customer_name=customer_name_clean,
        project_name=project_name_clean,
    )

    slab.material_name = material_name_clean
    slab.finish = finish_clean
    slab.height = height_clean
    slab.height_value = height_value
    slab.width = width_clean
    slab.width_value = width_value
    slab.thickness = thickness_clean
    slab.thickness_value = thickness_value
    slab.warehouse_group = warehouse_group_clean
    slab.status = status_clean
    slab.customer_name = customer_name_clean
    slab.project_name = project_name_clean
    slab.item_description = item_description_clean
    slab.porosity = porosity
    slab.is_active = status_clean != "used"

    if image is not None and image.filename:
        save_slab_image(slab, image)

    cleanup_match_group_if_needed(db, existing_match_group_code)

    db.commit()
    db.refresh(slab)
    return serialize_slab(slab, request)