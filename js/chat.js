(function () {
  'use strict';

  // Use the local dev server when running on localhost, the Vercel
  // function in production.
  const API_ENDPOINT =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api/chat'
      : '/api/chat';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('askForm');
    const input = document.getElementById('askInput');
    const thread = document.getElementById('askThread');
    if (!form || !input || !thread) return;

    const sendButton = form.querySelector('.ask__send');
    const history = [];
    let busy = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message || busy) return;

      busy = true;
      input.value = '';
      if (sendButton) sendButton.disabled = true;

      addEntry('q', message);
      const pending = addEntry('a', 'Thinking...');
      pending.classList.add('is-pending');

      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, history: history.slice(-10) }),
        });
        const data = await res.json();
        if (!res.ok || data.error || !data.response) {
          throw new Error(data.message || data.error || 'No response');
        }
        setText(pending, data.response);
        pending.classList.remove('is-pending');
        history.push({ role: 'user', content: message }, { role: 'assistant', content: data.response });
      } catch (err) {
        setText(pending, 'Something went wrong. Try again, or just send an email.');
        pending.classList.remove('is-pending');
        pending.classList.add('ask__entry--error');
      } finally {
        busy = false;
        if (sendButton) sendButton.disabled = false;
        input.focus();
      }
    });

    function addEntry(kind, text) {
      const entry = document.createElement('p');
      entry.className = 'ask__entry ask__entry--' + kind;

      const label = document.createElement('span');
      label.className = 'ask__label';
      label.textContent = kind + '.';

      const content = document.createElement('span');
      content.className = 'ask__text';
      content.textContent = text;

      entry.appendChild(label);
      entry.appendChild(content);
      thread.appendChild(entry);
      return entry;
    }

    function setText(entry, text) {
      const content = entry.querySelector('.ask__text');
      if (content) content.textContent = text;
    }
  });
})();
