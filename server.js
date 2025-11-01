import 'dotenv/config'; //loads env variables from a .env file to process.env
import express from 'express'; //express web framework
import path from 'path'; //help build OS-safe file paths
import { fileURLToPath } from 'url'; //convert a file URL into a real filesystem path
import fs from 'fs'; //read SQL migration file
import Database from 'better-sqlite3'; //SQLite driver
import rateLimit from 'express-rate-limit'; //express middleware for throttling requests

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ADMIN_KEY = process.env.ADMIN_KEY || 'secret';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const db = new Database(path.join(__dirname, 'queue.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronouns = NORMAL');

const migrateSQL = fs.readFileSync(path.join(__dirname, 'db', 'migrate.sql'), 'utf8');
db.exec(migrateSQL);

function requireAdmin(req, res, next){
    const key = req.headers['x-admin-key'] || req.query.key;
    if (key == ADMIN_KEY) return next(); //let the request continue
    return res.status(403).json({ error: 'Invalid admin key'});
}

const joinLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests-please try again shortly.' }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true}));

app.post('/api/join', joinLimiter, (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (join)'})
});

app.get('/api/ticket/:code', (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (ticket lookup)'})
});

app.get('/api/queue', (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (queue list)'})
});

app.post('/api/advance', requireAdmin, (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (advance)'})
});

app.post('/api/serve_called', requireAdmin, (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (seve called)'})
});

app.post('/api/cancel/:code', requireAdmin, (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (cancel)'})
});

app.listen(PORT, () => {
    console.log(`Queue app running at http://localhost:${PORT}`);
})
