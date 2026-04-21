// ── Digest form ──
const btn = document.getElementById('run-btn');
const btnLabel = btn.querySelector('.btn-label');
const topicInput = document.getElementById('topic');
const pingOnly = document.getElementById('ping-only');
const status = document.getElementById('status');

// Topic chip click handler
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    topicInput.value = chip.dataset.topic;
    topicInput.focus();
  });
});

// ── Subscription form ──
const subEmail = document.getElementById('sub-email');
const topicChips = document.querySelectorAll('.topic-chip');
const customInput = document.getElementById('custom-topic-input');
const addTopicBtn = document.getElementById('add-topic-btn');
const tagsContainer = document.getElementById('custom-tags');
const subscribeBtn = document.getElementById('subscribe-btn');
const subStatus = document.getElementById('sub-status');
const customTopics = [];

topicChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const active = chip.classList.toggle('active');
    chip.setAttribute('aria-pressed', active);
  });
});

function addCustomTopic() {
  const val = customInput.value.trim();
  if (!val || customTopics.includes(val)) { customInput.value = ''; return; }
  customTopics.push(val);

  const tag = document.createElement('span');
  tag.className = 'tag';
  const label = document.createTextNode(val + ' ');
  const removeBtn = document.createElement('button');
  removeBtn.className = 'tag-remove';
  removeBtn.setAttribute('aria-label', `Remove ${val}`);
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    customTopics.splice(customTopics.indexOf(val), 1);
    tag.remove();
  });
  tag.appendChild(label);
  tag.appendChild(removeBtn);
  tagsContainer.appendChild(tag);
  customInput.value = '';
  customInput.focus();
}

addTopicBtn.addEventListener('click', addCustomTopic);
customInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); }
});

subscribeBtn.addEventListener('click', async () => {
  const email = subEmail.value.trim();
  const selected = [...document.querySelectorAll('.topic-chip.active')].map(c => c.dataset.topic);
  const topics = [...selected, ...customTopics];

  subStatus.className = 'sub-status';
  subStatus.textContent = '';

  if (!email || !email.includes('@')) {
    subStatus.className = 'sub-status error';
    subStatus.textContent = 'Please enter a valid email.';
    return;
  }
  if (topics.length === 0) {
    subStatus.className = 'sub-status error';
    subStatus.textContent = 'Select at least one topic.';
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
      subStatus.className = 'sub-status success';
      subStatus.textContent = '✓ Subscribed! First digest arrives tomorrow at 8 AM UTC.';
      subEmail.value = '';
      document.querySelectorAll('.topic-chip.active').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      customTopics.length = 0;
      tagsContainer.innerHTML = '';
    } else {
      subStatus.className = 'sub-status error';
      subStatus.textContent = data.error || 'Something went wrong.';
    }
  } catch {
    subStatus.className = 'sub-status error';
    subStatus.textContent = 'Could not reach server.';
  } finally {
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = 'Subscribe';
  }
});

btn.addEventListener('click', () => {
  const topic = topicInput.value.trim() || 'Technology';
  btn.disabled = true;
  btn.classList.add('loading');
  status.className = '';
  status.textContent = '';

  if (pingOnly.checked) {
    btnLabel.textContent = 'Testing\u2026';
    fetch('/ping')
      .then(r => r.json())
      .then(data => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
        if (data.ok) {
          status.className = 'success';
          status.textContent = '\u2713 Check your Discord!';
        } else {
          status.className = 'error';
          status.textContent = `Error: ${data.error}`;
        }
      })
      .catch(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
        status.className = 'error';
        status.textContent = 'Could not reach server.';
      });
  } else {
    btnLabel.textContent = 'Sending\u2026';
    fetch(`/run?topic=${encodeURIComponent(topic)}`)
      .then(r => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
        if (r.ok) {
          status.className = 'success';
          status.textContent = '\u2713 Check your Discord!';
        } else {
          status.className = 'error';
          status.textContent = 'Server error \u2014 digest not started.';
        }
      })
      .catch(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnLabel.textContent = 'Generate Digest';
        status.className = 'error';
        status.textContent = 'Could not reach server.';
      });
  }
});
