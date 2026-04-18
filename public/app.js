const btn = document.getElementById('run-btn');
const topicInput = document.getElementById('topic');
const pingOnly = document.getElementById('ping-only');
const status = document.getElementById('status');

btn.addEventListener('click', () => {
  const topic = topicInput.value.trim() || 'Technology';
  btn.disabled = true;
  status.className = '';

  if (pingOnly.checked) {
    btn.textContent = 'Testing\u2026';
    status.textContent = 'Pinging Discord\u2026';
    fetch('/ping')
      .then(r => r.json())
      .then(data => {
        btn.disabled = false;
        btn.textContent = 'Generate Digest';
        if (data.ok) {
          status.className = 'success';
          status.textContent = 'Discord connection OK!';
        } else {
          status.className = 'error';
          status.textContent = `Error: ${data.error}`;
        }
      })
      .catch(() => {
        btn.disabled = false;
        btn.textContent = 'Generate Digest';
        status.className = 'error';
        status.textContent = 'Could not reach server.';
      });
  } else {
    btn.textContent = 'Generating\u2026';
    status.textContent = 'Generating digest\u2026';
    const evtSource = new EventSource(`/run?topic=${encodeURIComponent(topic)}`);
    evtSource.addEventListener('done', () => {
      evtSource.close();
      btn.disabled = false;
      btn.textContent = 'Generate Digest';
      status.className = 'success';
      status.textContent = 'Digest sent to Discord!';
    });
    evtSource.addEventListener('error', e => {
      evtSource.close();
      btn.disabled = false;
      btn.textContent = 'Generate Digest';
      status.className = 'error';
      status.textContent = e.data ? `Error: ${e.data}` : 'Digest generation failed.';
    });
    evtSource.onerror = () => {
      if (evtSource.readyState === EventSource.CLOSED) return;
      evtSource.close();
      btn.disabled = false;
      btn.textContent = 'Generate Digest';
      status.className = 'error';
      status.textContent = 'Connection to server lost.';
    };
  }
});
