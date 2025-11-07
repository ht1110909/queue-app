//import { act } from "react";

const $ = sel => document.querySelector(sel); //helper so that you don't have to write .querySelector over again

let ADMIN_KEY = sessionStorage.getItem('admin_key') || '';

const keyInput = $(`#key`); //finds the id='joinForm' on html
const saveKeyBtn = $(`#saveKeyBtn`);
const keyMsg = $(`#keyMsg`);

const callBtn = $(`#callBtn`);
const serveBtn = $(`#serveBtn`);
const cancelCode = $(`#cancelCode`);
const cancelBtn = $(`#cancelBtn`);
const actMsg = $(`#actMsg`);

const rows = $(`#rows`);
const last = $(`#last`);

keyInput.value = ADMIN_KEY;

saveKeyBtn.addEventListener('click', () => {
    ADMIN_KEY = keyInput.value || '';
    sessionStorage.setItem('ADMIN_KEY', ADMIN_KEY);
    keyMsg.textContent = ADMIN_KEY ? 'Key saved in this tab.' : '';
    setTimeout(() => (keyMsg.textContent = ''), 1200);
});

async function api(method, path, body){
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY}
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error (data?.error || `HTTP ${r.status}`);
    }
    return data;
}

async function loadQueue(){
    try {
        const data = await api('GET', '/api/queue');
        rows.innerHTML = (data.queue || [])
            .map((p, i) =>`
                <tr>
                    <td>${i + 1}</td>
                    <td>${p.name}</td>
                    <td>${p.size}</td>
                    <td><span class="badge">${p.status}</span></td>
                    <td>${p.sushi}</td>
                    <td>${p.code}</td>
                </tr>
                `).join('') || '<tr><td colspan="5">Empty.</td></tr>'
        last.textContent = 'Updated ' + new Date().toLocaleTimeString();
    } catch (e) {
        rows.innerHTML = `<tr><td colspan="5" class="err">${e.message}</td?</tr>`;
    }
}

callBtn.addEventListener('click', async () => {
    callBtn.disabled = true;
    try{
        const { message } = await api('POST', '/api/advance');
        actMsg.textContent = message || 'Advanced.';
        await loadQueue();
    } catch (e) {
        actMsg.textContent = e.message;
    } finally {
        callBtn.disabled = false;
        setTimeout(() => (actMsg.textContent = ''), 1500);
    }
});

serveBtn.addEventListener('click', async () => {
    serveBtn.disabled = true;
    try{
        const { message } = await api('POST', '/api/serve_called');
        actMsg.textContent = message || 'Served';
        await loadQueue();
    }
    catch (e) {
        actMsg.textContent = e.message;
    } finally {
        serveBtn.disabled = false;
        setTimeout(() => (actMsg.textContent = ''), 1500);
    }
});

cancelBtn.addEventListener('click', async () => {
    const code = cancelCode.value.trim().toUpperCase();
    if (!code) return;
    cancelBtn.disabled = true;
    try{
        const { message } = await api('POST', `/api/cancel/${encodeURIComponent(code)}`);
        actMsg.textContent = message || 'Canceled';
        cancelCode.value = '';
        await loadQueue();
    } catch (e) {
        actMsg.textContent = e.message;
    } finally {
        cancelBtn.disabled = false;
        setTimeout(() => (actMsg.textContent = ''), 1500);
    }
});

loadQueue();
setInterval(loadQueue, 5000);
