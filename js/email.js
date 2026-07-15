/**
 * Email capture stub — wire FORM_ENDPOINT before launch.
 * Supports common form backends that accept POST JSON or form-encoded email.
 */

const FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxx' or Beehiiv/ConvertKit endpoint

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('emailForm');
  const note = document.getElementById('emailNote');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button[type="submit"]');
    const email = (input?.value || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Enter a valid email address.');
      input?.focus();
      return;
    }

    if (!FORM_ENDPOINT) {
      alert('Email list is stubbed for now — FORM_ENDPOINT not set in js/email.js yet. Thanks for the interest.');
      if (note) {
        note.innerHTML = '<strong>Captured locally (dev):</strong> ' + email + ' — connect a real endpoint before going live.';
      }
      form.reset();
      return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Request failed');
      alert('You\'re on the list. Welcome to the velvet rope.');
      form.reset();
    } catch (err) {
      console.error(err);
      alert('Could not subscribe right now. Try again later or hit us on Facebook.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
});
