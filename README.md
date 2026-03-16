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

---

# Development Status

This project is currently in active development.

The system is being built as a practical warehouse tool and is evolving toward a full inventory management solution for stone slab storage.
