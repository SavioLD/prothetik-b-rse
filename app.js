/* ============================================================
   Prothetik Börse – gemeinsame Logik (Frontend-Prototyp)
   Alle Daten sind Demo-Daten und werden nur lokal im Browser
   gehalten – es findet keine Übertragung statt.
   ============================================================ */

const PB = {

  /* ---------- Toast ---------- */
  toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>' +
      msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  },

  /* ---------- Modal ---------- */
  openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  },
  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  },

  /* ---------- Auswahl-Kacheln (Art der Anfrage, Rolle) ---------- */
  initTiles(selector, { multi = false } = {}) {
    document.querySelectorAll(selector).forEach(tile => {
      tile.addEventListener('click', () => {
        if (!multi) {
          document.querySelectorAll(selector).forEach(t => t.classList.remove('selected'));
        }
        tile.classList.toggle('selected', multi ? !tile.classList.contains('selected') : true);
      });
    });
  },

  /* ---------- Range-Slider mit Füllstand ---------- */
  initRange(input, onChange) {
    const update = () => {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty('--fill', pct + '%');
      if (onChange) onChange(Number(input.value));
    };
    input.addEventListener('input', update);
    update();
  },

  /* ---------- Datei-Upload (Demo) ---------- */
  initDropzone(zoneId, listId) {
    const zone = document.getElementById(zoneId);
    const list = document.getElementById(listId);
    if (!zone) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.stl,.dcm';
    fileInput.style.display = 'none';
    zone.appendChild(fileInput);

    const addFiles = files => {
      [...files].forEach(f => {
        const row = document.createElement('div');
        row.className = 'file-item';
        row.innerHTML =
          '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<span>' + f.name + '</span>' +
          '<button class="rm" title="Entfernen" type="button">&#10005;</button>';
        row.querySelector('.rm').addEventListener('click', () => row.remove());
        list.appendChild(row);
      });
      if (files.length) PB.toast('Datei hinzugefügt – Übertragung erfolgt Ende-zu-Ende-verschlüsselt');
    };

    zone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag');
      addFiles(e.dataTransfer.files);
    });
  },

  /* ---------- Freitext-Wächter (Demo) ----------
     Warnt, wenn ein Text nach Patientendaten aussieht.
     Im echten Produkt läuft dieselbe Prüfung zusätzlich serverseitig. */
  looksLikePatientData(text) {
    const patterns = [
      /\b\d{1,2}\.\d{1,2}\.(19|20)\d{2}\b/,        // Geburtsdatum 12.03.1958
      /\b(geb\.|geboren am)\b/i,                    // "geb." / "geboren am"
      /\b(herr|frau|patient(in)?)\s+[A-ZÄÖÜ][a-zäöüß]+/, // "Frau Müller", "Patient Schmidt"
      /\b[A-Z]\d{9}\b/                              // Versichertennummer-Format
    ];
    return patterns.some(rx => rx.test(text));
  },

  warnPatientData() {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<svg fill="none" stroke="#E89B2F" stroke-width="2.2" viewBox="0 0 24 24" width="17" height="17"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' +
      'Achtung: Der Text enthält möglicherweise Patientendaten (Name/Geburtsdatum). Bitte entfernen – die Fall-Nummer genügt.';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 5000);
  },

  /* ---------- Chat (Demo) ---------- */
  initChat({ bodyId, inputId, sendId, replyAs }) {
    const body = document.getElementById(bodyId);
    const input = document.getElementById(inputId);
    const send = document.getElementById(sendId);
    if (!body || !input || !send) return;

    const now = () =>
      new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const append = (text, who, initials) => {
      const msg = document.createElement('div');
      msg.className = 'msg ' + who;
      msg.innerHTML =
        '<div class="avatar">' + initials + '</div>' +
        '<div class="bubble">' + text + '</div>' +
        '<time>' + now() + '</time>';
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    };

    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      if (PB.looksLikePatientData(text)) { PB.warnPatientData(); return; }
      append(text, 'me', 'SR');
      input.value = '';
      setTimeout(() => {
        append('Alles klar, danke für die Info! Ich melde mich, sobald es Neuigkeiten gibt. 👍', 'them', replyAs);
      }, 1400);
    };

    send.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    body.scrollTop = body.scrollHeight;
  }
};
