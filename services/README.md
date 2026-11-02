# `services` folder

This folder contains **all the backend services** (APIs and background workers) related to the company for the cross-functional AI Engineering project.

Each subfolder inside `services/` must correspond to **one specific service** (for example: `admin-api`, `data-processor-worker`) and include its own technical and functional documentation.

- **Main purpose**: to centralize all the backend logic, APIs, and queue consumers that support the company's use cases.
- **Recommendation**: document in this file (or in sub-READMEs) the services you add, their objective, the technology used, and how to run them.

---

## Incident Analysis Service

- **Location**: `src/incident_service.py` (shared logic), `src/routers/incidents.py` (REST endpoints)
- **Purpose**: Upload a CSV of incidents, validate columns, count by status/category/priority, and export results.
- **Technology**: Python 3.12+, FastAPI, stdlib `csv`.
- **CLI**: `uv run python scripts/analyze.py path/to/incidents.csv [--export output.csv]`

### Endpoints

| Method | Path                            | Description                              |
|--------|---------------------------------|------------------------------------------|
| POST   | `/api/incidents/analyze`        | Upload CSV → receive JSON analysis       |
| GET    | `/api/incidents/results/export` | Download last analysis as CSV            |

### Required CSV columns

`id`, `title`, `category`, `priority`, `status`

### Analysis metrics

- Total incidents
- Open (open + in_progress) / Closed (resolved + closed)
- Breakdown by status, category, and priority

> _Spanish version: [README.es.md](./README.es.md)._
