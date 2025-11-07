const $ = sel => document.querySelector(sel); //helper so that you don't have to write .querySelector over again

const form = $(`#joinForm`); //finds the id='joinForm' on html
const joinBtn = $(`#joinBt`);
const msg = $(`#msg`);
const card = $(`#ticketCard`);
const codeEl = $(`#code`);
const copyBtn = $(`#copyBtn`);
const ticketLink = $(`#ticketLink`);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    joinBtn.disabled = true;

    const name = $(`#name`).value.trim()
    const size = parseInt($(`#size`).value,10);
    const sushi = $(`#sushi`).value;

    try{
        const r = await fetch('/api/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ name, size, sushi })
        });

        const data = await r.json();

        if(!r.ok) {
            msg.textContent = data?.error || 'Failed to join.';
            joinBtn.disabled = false;
            return;
        }

        const { code, ticket_url } = data;
        codeEl.textContent = code;
        ticketLink.href = ticket_url || `/ticket.html?code=${encodeURIComponent(code)}`;
        card.style.display = '';
        localStorage.setItem('last_code', code);
    } catch(err){
        msg.textContent = 'Network error. Please try again.';
    } finally {
        joinBtn.disabled = false;
    }
});

copyBtn.addEventListener('click', async () => {
    const code = codeEl.textContent.trim();
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy code'), 1200);
    } catch{}
});
