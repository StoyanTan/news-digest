// ── Refs ──
const modeSlider   = document.getElementById('mode-slider');
const btnDiscord   = document.getElementById('btn-discord');
const btnEmail     = document.getElementById('btn-email');
const secDiscord   = document.getElementById('section-discord');
const secEmail     = document.getElementById('section-email');

const btn          = document.getElementById('run-btn');
const btnLabel     = btn.querySelector('.btn-label');
const topicInput   = document.getElementById('topic');
const pingOnly     = document.getElementById('ping-only');

const subEmail     = document.getElementById('sub-email');
const customInput  = document.getElementById('custom-topic-input');
const addTopicBtn  = document.getElementById('add-topic-btn');
const tagsContainer= document.getElementById('custom-tags');
const subscribeBtn = document.getElementById('subscribe-btn');

const statusEl     = document.getElementById('status');
const customTopics = [];

// ── Mode switcher ──
function setMode(mode) {
  const discord = mode === 'discord';
  modeSlider.classList.toggle('right', !discord);
  btnDiscord.setAttribute('aria-selected', discord);
  btnEmail.setAttribute('aria-selected', !discord);
  secDiscord.classList.toggle('hidden', !discord);
  secEmail.classList.toggle('hidden', discord);
  setStatus('');
}

btnDiscord.addEventListener('click', () => setMode('discord'));
btnEmail.addEventListener('click',   () => setMode('email'));

// ── Discord chips — fill text input (single-select feel) ──
document.querySelectorAll('#section-discord .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    topicInput.value = chip.dataset.topic;
    topicInput.focus();
  });
});

// ── Email chips — toggle active (multi-select) ──
document.querySelectorAll('.sub-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const active = chip.classList.toggle('active');
    chip.setAttribute('aria-pressed', String(active));
  });
});

// ── Status helper ──
function setStatus(msg, type = '') {
  statusEl.className = type;
  statusEl.textContent = msg;
}

// ── Custom subscription topics ──
function addCustomTopic() {
  const val = customInput.value.trim();
  if (!val || customTopics.includes(val)) { customInput.value = ''; return; }
  customTopics.push(val);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.appendChild(document.createTextNode(val + ' '));

  const removeBtn = document.createElement('button');
  removeBtn.className = 'tag-remove';
  removeBtn.setAttribute('aria-label', `Remove ${val}`);
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    customTopics.splice(customTopics.indexOf(val), 1);
    tag.remove();
  });

  tag.appendChild(removeBtn);
  tagsContainer.appendChild(tag);
  customInput.value = '';
  customInput.focus();
}

addTopicBtn.addEventListener('click', addCustomTopic);
customInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); }
});

// ── Generate Digest ──
btn.addEventListener('click', () => {
  const topic = topicInput.value.trim() || 'Technology';
  btn.disabled = true;
  btn.classList.add('loading');
  setStatus('');

  if (pingOnly.checked) {
    btnLabel.textContent = 'Testing…';
    fetch('/ping')
      .then(r => r.json())
      .then(data => {
        if (data.ok) setStatus('✓ Check your Discord!', 'success');
        else setStatus(`Error: ${data.error}`, 'error');
      })
      .catch(() => setStatus('Could not reach server.', 'error'))
      .finally(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
      });
  } else {
    btnLabel.textContent = 'Sending…';
    fetch(`/run?topic=${encodeURIComponent(topic)}`)
      .then(r => {
        if (r.ok) setStatus('✓ Check your Discord!', 'success');
        else setStatus('Server error — digest not started.', 'error');
      })
      .catch(() => setStatus('Could not reach server.', 'error'))
      .finally(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
      });
  }
});

// ── Subscribe ──
subscribeBtn.addEventListener('click', async () => {
  const email  = subEmail.value.trim();
  const selected = [...document.querySelectorAll('.sub-chip.active')].map(c => c.dataset.topic);
  const topics = [...selected, ...customTopics];

  setStatus('');

  if (!email || !email.includes('@')) {
    setStatus('Please enter a valid email.', 'error');
    return;
  }
  if (topics.length === 0) {
    setStatus('Select at least one topic.', 'error');
    return;
  }

  subscribeBtn.disabled = true;
  subscribeBtn.textContent = 'Subscribing…';

  try {
    const res = await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, topics }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus('✓ Subscribed! First digest in ~15 min, then daily at 10 AM CET.', 'success');
      subEmail.value = '';
      document.querySelectorAll('.sub-chip.active').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      customTopics.length = 0;
      tagsContainer.innerHTML = '';
    } else {
      setStatus(data.error || 'Something went wrong.', 'error');
    }
  } catch {
    setStatus('Could not reach server.', 'error');
  } finally {
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = 'Subscribe';
  }
});
