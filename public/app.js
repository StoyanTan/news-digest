const btn = document.getElementById('run-btn');
const topicInput = document.getElementById('topic');
const status = document.getElementById('status');
btn.addEventListener('click', () => {

  btn.disabled = true;
  btn.textContent = 'Generating\u2026';
  status.className = '';
  status.textContent = 'Running\u2026';

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
      status.textContent = 'Something went wrong.';
    });
});
