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

// --- utilities & DB helpers ---
function genCode(){
    //Make a short, human-typeable ticket code
    return Math.random().toString(36).slice(2,8).toUpperCase;
}

function publicParty(p){
    // Shape a DB row to the public/admin response format
    return { id:p.id, code: p.code, name: p.name, size: p.size, status: p.status, sushi: p.sushi};
}

function getQueue(){
    // reade the active queue in first-come order
    return db.prepare("SELECT * FROM parties WHERE status IN ('waiting','called') ORDER BY id ASC").all(); //ASC = ascending order
}

function positionOf(code) {
    // Find the 1-based position of a given ticket code among waited/called
    const q = getQueue();
    const idx = q.findIndex(p => p.code == code);
    return idx >= 0 ? idx +1 : null;
}

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
    let { name, size, sushi } = req.body || {};

    name = (name || '').trim().slice(0,50);
    size = Math.max(1, parseInt(size || 1,10));
    if (!name) return res.status(400).json({error: 'Name required'});
    if (!Number.isFinite(size) || size < 1 || size > 5) {
        return res.status(400).json({ error: 'Party size must be between 1 and 5'});
    }
    if (!sushi) return res.status(400).json({error: 'Sushi required'});

    //---ToDo: maybe set a limit for how many people can be in the queue?---//
    let code = genCode();
    while(db.prepare("SELECT 1 FROM parties WHERE code=?").get(code)) {
        code = genCode();
    }

    db.prepare("INSERT INTO parties (code, name, size, sushi) VALUES (?, ?, ?)").run(code, name, size, sushi);

    const ticket_url = `/ticket.html?code=${code}`;
    return res.status(201).json({ code, ticket_url});
});

app.get('/api/ticket/:code', (req, res) => {
    const code = (req.params.code || '').toUpperCase();

    const p = db.prepare("SELECT * FROM parties WHERE code=?").get(code);
    if(!p){
        return res.status(401).json({ error: 'Ticket not found'});
    }

    const position = positionOf(code); //null if served/canceled/not present
    return res.json({
        code: p.code,
        name: p.name,
        size: p.size,
        status: p.status,
        sushi: p.sushi,
        position
    });
});

app.get('/api/queue', (req, res) => {
    const queue = getQueue().map(publicParty);
    return res.json({ queue });
});

app.post('/api/advance', requireAdmin, (req, res) => {
    const waiting = db.prepare(
        "SELECT * FROM parties WHERE status='waiting' ORDER BY id ASC LIMIT 1"
    ).get();

    if(!waiting){
        return res.json({ message: 'No one is waiting'});
    }

    db.prepare(
        "UPDATE parties SET status='called', called_at=CURRENT_TIMESTAMP WHERE id=?"
    ).get(waiting.id);

    return res.json({ message: `Called ${waiting.name} (${waiting.code}).`});
});

app.post('/api/serve_called', requireAdmin, (req, res) => {
    const called = db.prepare(
        "SELECT * FROM parties WHERE status='called' ORDER BY called_at ASC LIMIT 1"
    ).get();

    if(!called){
        return res.json({ message: 'No one is currently called.'});
    }

    db.prepare(
        "UPDATE parties SET status='served', served_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(called.id);

    return res.json({ message: `Served ${called.name}.`});

});

app.post('/api/cancel/:code', requireAdmin, (req, res) => {
    return res.status(501).json({ error: 'Not implemented yet (cancel)'})
});

app.listen(PORT, () => {
    console.log(`Queue app running at http://localhost:${PORT}`);
})
