# Swahilipot Hub — Attachment Portal (static prototype)

A dependency-free, role-based front end for the Swahilipot Hub attachment
programme. Built with just **`index.html`**, **`style.css`** and **`app.js`**.
Authentication is simulated with `localStorage`, so it runs from any static
file server with no backend.

## Run it

```bash
cd static-portal
python3 -m http.server 8080
# then open http://localhost:8080
```

(Or open `index.html` directly — though a server is recommended so the
font/logo assets load cleanly.)

## Roles & dashboards

After login the user is redirected to the dashboard for their role:

| Role | Dashboard |
| --- | --- |
| **Attachee** | Profile, assignment submission form (PDF/DOCX upload), and a list of their submissions with status + supervisor feedback. |
| **Supervisor** | Attachees in their department with progress bars, plus a review queue to approve/reject submissions and leave comments. |
| **Admin** | Manage departments and people, system-wide reports, submissions-per-department analytics, and site settings. |

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Attachee | `attachee@swahilipot.org` | `attach123` |
| Supervisor | `supervisor@swahilipot.org` | `super123` |
| Admin | `admin@swahilipot.org` | `admin123` |

## Features

- Role-based authentication + redirection (modular functions in `app.js`).
- Assignment file upload (PDF / DOC / DOCX, max 2 MB), stored as base64 in
  `localStorage` and downloadable from the dashboards.
- In-app notifications: supervisors are alerted when a new submission arrives;
  attachees are alerted when their work is reviewed.
- Admin analytics: submissions-per-department bar chart and status breakdown.
- Consistent Swahilipot branding (logo gradient blues, Plus Jakarta Sans +
  Inter) and a mobile-responsive layout with a collapsible sidebar.

## Architecture

`app.js` is organised into small modules: `db` (persistence + seed), `auth`
(login / session / role guards), `notify` (notifications), `ui` (toast / modal
helpers), `router` (hash routing with role guards) and `pages` (one render
function per role).

### Swapping in a real backend

Replace `auth.login()` and the `data.*` read/write helpers with API calls.
The seeded data shape mirrors a typical relational schema (users,
departments, submissions, notifications), so it maps cleanly onto a REST API.
