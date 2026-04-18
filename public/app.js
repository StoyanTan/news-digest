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
