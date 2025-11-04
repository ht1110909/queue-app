const $ = sel => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const code = (params.get('code') || '').toUpperCase();

const codeEl = $('#code');
const statusEl = $('#status');
const posEl = $('#position');
const msg = $('#msg');
const refreshBtn = $('#refreshBtn');

codeEl.textContent = code ||'-';

async function load() {
    if (!code) {
        msg.textContent = 'Missing code. Go back to the join page.';
        return;
    }
    msg.textContent = '';

    try {
        const r = await fetch(`/api/ticket/${encodeURIComponent(code)}`);
        const data = await r.json();

        if(!r.ok){
            msg.textContent = data?.error || 'Ticket not found';
            statusEl.textContent = '-';
            posEl.textContent = '-';
            return;
        }

        statusEl.textContent = data.status.toUpperCase();
        posEl.textContent = data.position == null ? '-' : data.position;

        if(data.status == 'called'){
            document.title = 'CALLED - Your ticket';
        } else{
            document.title = 'Your ticket';
        }
    } catch (e) {
        msg.textContent = 'Network error.';
    }
}

refreshBtn.addEventListener('click', load);

load();
setInterval(load, 12000);
