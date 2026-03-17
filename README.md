# StoneSlabApp

StoneSlabApp is a warehouse and inventory management application designed for tracking natural stone slabs.
It allows slabs to be cataloged, viewed, filtered, and updated with images and metadata.

The system is designed to support real warehouse workflows and will eventually include barcode scanning and mobile-friendly slab management.

---

# Technology Stack

Backend
- FastAPI
- SQLAlchemy
- PostgreSQL

Frontend
- Next.js
- React
- TypeScript

Infrastructure
- Docker / Docker Compose
- Local development server
- GitHub for version control

---

# Project Structure

StoneSlabApp/
|
|-- backend/                # FastAPI backend
|   `-- app/
|
|-- frontend/               # Next.js frontend
|   `-- app/
|
|-- storage/                # Runtime storage (not tracked in Git)
|   `-- slabs/              # Uploaded slab images
|
|-- docker-compose.yml
|-- .gitignore
`-- README.md

Uploaded slab images are stored in:

storage/slabs/

These files are runtime data and are not committed to Git.

---

# Running the Application

## Backend

Start the FastAPI backend:

cd backend
uvicorn app.main:app --reload

Backend API:
http://127.0.0.1:8000

---

## Frontend

Start the Next.js frontend:

cd frontend
npm install
npm run dev

Frontend UI:
http://localhost:3000

Slab page:
http://localhost:3000/slabs

---

# Current Features

- Slab inventory database
- Slab list page
- Slab detail page
- Slab creation page
- Image upload for slabs
- Automatic slab image naming based on slab dimensions
- PostgreSQL-backed data storage
- Local development environment
- GitHub repository and version control

---

# Planned Features

- Advanced filtering
- Pagination
- Barcode scanning
- QR scanning
- Mobile-friendly warehouse workflow
- Bulk slab operations
- Deployment to NAS server
- Warehouse location management

---

# Image Naming Convention

Uploaded slab images follow the format:

slab00009(120x54x0.75).jpg

Where:

SLAB_CODE(height x width x thickness)

This ensures images are human-readable and easily identifiable outside the system.

## Numeric Dimension Fields

The app now stores slab dimensions in two forms:

- Original text values for display:
  - `height`
  - `width`
  - `thickness`

- Numeric values for filtering/querying:
  - `height_value`
  - `width_value`
  - `thickness_value`

Supported input formats include:

- whole numbers (`120`)
- decimals (`0.75`, `.5`)
- fractions (`3/4`)
- mixed fractions (`1 1/2`, `126 1/8`)

### Behavior

- On slab create/update, dimension text is parsed and numeric values are stored.
- Backend slab filtering now uses numeric dimension values instead of string comparison.
- Default slab list load returns the latest 20 slabs.
- When filters are applied, filtering runs against the full dataset.

### Important database note

The database must include these columns in the `slabs` table:

- `height_value`
- `width_value`
- `thickness_value`

Example SQL:

```sql
ALTER TABLE slabs ADD COLUMN height_value NUMERIC(10,4);
ALTER TABLE slabs ADD COLUMN width_value NUMERIC(10,4);
ALTER TABLE slabs ADD COLUMN thickness_value NUMERIC(10,4);

---
## 110917c

### Pricing
- Added editable `price_per_sqft` field for each slab
- Backend now returns computed `square_feet` and `total_price`
- Slab gallery supports filtering by maximum price per square foot
- Slab cards show price per square foot in the bottom-right corner
- Slab detail page shows:
  - price per square foot
  - square footage
  - total price
- New slab page supports entering price per square foot

### Dimensions and filtering
- Slab dimensions are stored both as display text and numeric values
- Backend filtering uses numeric dimension values instead of string comparison
- Default slab gallery load returns the latest 20 slabs
- Supported numeric filtering includes:
  - height
  - width
  - thickness
  - price per square foot

### Image handling
- Slab image filenames are generated from slab code and dimensions
- When slab dimensions are edited, the existing image filename is automatically renamed to reflect the updated dimensions
- Uploading a new image on edit also saves it using the current slab dimensions in the filename

### Image and thumbnail URLs
- `image_url` points to the full uploaded slab image and is used for full-size detail and download flows.
- `thumbnail_url` points to the generated preview thumbnail used by gallery and matched slab preview cards.
- API responses safely fall back to `image_url` when `thumbnail_url` is missing, so older rows still render previews.

### Backfilling older slabs
To generate thumbnails for older slabs that have an image but no `thumbnail_url`, run:

```bash
cd backend
python -m app.main --backfill-missing-thumbnails
```

This command only processes slabs missing `thumbnail_url` and skips unreadable images without aborting the whole run.
# Development Status

This project is currently in active development.

The system is being built as a practical warehouse tool and is evolving toward a full inventory management solution for stone slab storage.
