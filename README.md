# RANA Company Website

A full-stack company website for RANA — a water, roads, sanitation, and civil
infrastructure firm — with a public marketing site and an admin dashboard for
managing every piece of content without touching code.

## What's included

- **Public site**: Home, About, Projects (with filters + detail pages),
  Partners, News & Events (with article pages), and FAQs — all rendered
  dynamically from the backend API.
- **Language switch**: English / French, toggled from the header on every
  page. Content authors can edit both languages from the admin dashboard.
- **Admin dashboard**: sign in and edit site settings, the About page,
  Projects, Partners, News & Events, and FAQs — add, edit, and delete items,
  no code changes needed.
- **Backend**: Node.js + Express REST API, with JSON-file storage (no
  database setup required) and JWT-based admin authentication.
- **Custom logo**: `frontend/assets/logo.svg`, an original monogram mark.

## Requirements

- [Node.js](https://nodejs.org) 18 or later (includes npm)
- A code editor — this project is a plain Node/Express + static-HTML project,
  so it opens and runs in **Visual Studio Code** with no special extensions.

## Setup (in VS Code)

1. Open this folder in VS Code (`File → Open Folder…`).
2. Open a terminal in VS Code (`` Ctrl+` `` / `` Cmd+` ``).
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open **http://localhost:3000** in your browser. The admin dashboard is at
   **http://localhost:3000/admin**.

   For auto-restart on file changes during development, use `npm run dev`
   instead of `npm start`.

## Admin login

- **Username:** `admin`
- **Password:** `rana`

Change the password right away from **Admin → Account** once you've signed
in — it's stored as a salted hash (Node's built-in `crypto.scrypt`), not in
plain text.

## Project structure

```
rana-website/
├── backend/
│   ├── server.js            # Express app + static file serving
│   ├── utils.js              # JSON data read/write helpers
│   ├── middleware/auth.js    # JWT verification for admin routes
│   ├── routes/
│   │   ├── auth.js           # Login + change password
│   │   └── content.js        # Public GET + admin-only write endpoints
│   └── data/                 # Site content, stored as JSON files
│       ├── settings.json     # Contact info, tagline, homepage stats
│       ├── about.json        # About page copy (EN + FR)
│       ├── projects.json     # Project list
│       ├── partners.json     # Partner list
│       ├── news.json         # News & Events posts
│       ├── faqs.json         # FAQ entries
│       ├── ui.json           # Interface translation strings
│       └── admin.json        # Auto-created on first run (hashed password)
├── frontend/
│   ├── index.html, about.html, projects.html, project.html,
│   │   partners.html, news.html, article.html, faqs.html, 404.html
│   ├── admin/
│   │   ├── login.html
│   │   └── dashboard.html
│   ├── css/style.css
│   ├── js/
│   │   ├── i18n.js            # Language switching
│   │   ├── site.js            # Shared header/footer/data loading
│   │   ├── pages.js           # Public-page rendering
│   │   ├── admin.js           # Admin login
│   │   └── admin-dashboard.js # Admin CRUD panels
│   └── assets/logo.svg
└── package.json
```

## How content updates work

Every public page loads its content from `GET /api/site` at runtime — there's
nothing to rebuild. When you edit and save something in the admin dashboard,
it's written straight to the matching JSON file in `backend/data/`, and the
next page load (by anyone, in any language) reflects the change immediately.

## Notes for deployment

- Set a real `JWT_SECRET` environment variable in production (the code falls
  back to a development default otherwise).
- `backend/data/*.json` is the entire database. Back it up like you would any
  database, and make sure your hosting platform's filesystem persists across
  deploys (or swap `utils.js` for a real database later — the route code
  won't need to change much).
- The site runs on a single Node process (`npm start`) and serves both the
  API and the static frontend, so most Node hosts (Render, Railway, a small
  VPS, etc.) work with no extra configuration.
