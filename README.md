# QueueLine

A small virtual-queue web app. Guests join a line from their phone, get a short ticket code, and watch their place in line update live. Staff use an admin page to call the next party, mark them served, or cancel no-shows.

The current version is set up for a food line: each guest picks a favorite sushi (salmon, tuna, eel, veggie, or shrimp) when joining, and that choice is used to confirm who they are at check-in.

## Features

- **Join the line** with a first name, party size, and sushi choice. Each party gets a unique 6-character code (e.g. `K3F9QZ`).
- **Live ticket page** showing your status (`WAITING`, `CALLED`, `SERVED`, `CANCELED`) and position in line. It refreshes every 12 seconds, and the browser tab title changes to `CALLED` when it's your turn.
- **Admin dashboard** to call the next party, serve the called party, and cancel by code. The queue table refreshes every 5 seconds.
- **Admin key** protection on all staff endpoints.
- **Rate limiting** on joins (20 requests per minute per IP).
- **SQLite storage** with WAL mode, so no separate database server is needed.

## Tech stack

- **Backend:** Node.js, Express 5, better-sqlite3, express-rate-limit, dotenv
- **Frontend:** Plain HTML, CSS, and vanilla JavaScript (no build step)

## Getting started

### Prerequisites

- Node.js 18 or newer

### Install and run

```bash
git clone https://github.com/ht1110909/queue-app.git
cd queue-app
npm install
npm start          # or: npm run dev  (auto-restarts with nodemon)
```

Then open:

- Join page: <http://localhost:3000/>
- Admin page: <http://localhost:3000/admin.html>

The database file `queue.db` is created automatically on first run from `db/migrate.sql`.

### Configuration

Create a `.env` file in the project root:

```env
ADMIN_KEY=choose-a-strong-key
PORT=3000
```

| Variable    | Default  | Description                                  |
|-------------|----------|----------------------------------------------|
| `ADMIN_KEY` | `secret` | Key required for all admin endpoints          |
| `PORT`      | `3000`   | Port the server listens on                    |

Always set your own `ADMIN_KEY` before using the app anywhere public.

## How it works

1. A guest fills out the form on the join page and receives a ticket code and a link to their ticket page.
2. The ticket page polls the server for the party's status and position.
3. A staff member enters the admin key on the admin page and uses:
   - **Call Next**: moves the earliest `waiting` party to `called`.
   - **Serve Called**: moves the earliest `called` party to `served`.
   - **Cancel**: marks a party `canceled` by code (for no-shows).

A party's position counts everyone who is `waiting` or `called`, in the order they joined.

```
waiting ──▶ called ──▶ served
   │           │
   └───────────┴──▶ canceled
```

## API reference

Admin endpoints require the key in an `x-admin-key` header (or a `?key=` query parameter).

| Method | Endpoint              | Auth  | Description |
|--------|-----------------------|-------|-------------|
| GET    | `/health`             | —     | Health check, returns `{ "ok": true }` |
| POST   | `/api/join`           | —     | Join the queue. Body: `{ "name", "size", "sushi" }`. Returns `{ "code", "ticket_url" }` |
| GET    | `/api/ticket/:code`   | —     | Ticket details: name, size, status, sushi, position |
| GET    | `/api/queue`          | Admin | List all `waiting` and `called` parties |
| POST   | `/api/advance`        | Admin | Call the next waiting party |
| POST   | `/api/serve_called`   | Admin | Serve the earliest called party |
| POST   | `/api/cancel/:code`   | Admin | Cancel a party by code |

Example:

```bash
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"name":"Hana","size":2,"sushi":"salmon"}'

curl http://localhost:3000/api/queue -H "x-admin-key: $ADMIN_KEY"
```

## Project structure

```
queue-app/
├── server.js          # Express server, API routes, DB setup
├── db/
│   └── migrate.sql    # SQLite schema (parties table + index)
├── public/
│   ├── index.html     # Join page
│   ├── join.js        # Join form logic
│   ├── ticket.html    # Ticket status page
│   ├── ticket.js      # Polls position/status for a code
│   ├── admin.html     # Staff controls
│   ├── admin.js       # Calls admin APIs, refreshes queue list
│   └── styles.css     # Shared styles
├── package.json
└── LICENSE
```

## Database schema

Table `parties`:

| Column       | Type     | Notes |
|--------------|----------|-------|
| `id`         | INTEGER  | Primary key, sets queue order |
| `code`       | TEXT     | Unique ticket code |
| `name`       | TEXT     | Guest's first name (max 50 chars) |
| `size`       | INTEGER  | Party size |
| `status`     | TEXT     | `waiting`, `called`, `served`, or `canceled` |
| `sushi`      | TEXT     | Sushi choice used at check-in |
| `created_at` | DATETIME | When the party joined |
| `called_at`  | DATETIME | When the party was called |
| `served_at`  | DATETIME | When the party was served |

## Roadmap

- Optional cap on how many parties can be in the queue at once
- Customizable menu options instead of a fixed sushi list

## License

[MIT](LICENSE) © 2025 Hana Takatori
