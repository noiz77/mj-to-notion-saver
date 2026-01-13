document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token');
  const dbIdInput = document.getElementById('dbId');

  // Debounce function to limit save frequency
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Load saved values
  chrome.storage.local.get(['notionToken', 'notionDbId'], (items) => {
    if (items.notionToken) tokenInput.value = items.notionToken;
    if (items.notionDbId) dbIdInput.value = items.notionDbId;
  });

  // Auto-save on input for token (with debounce)
  const saveToken = debounce((value) => {
    chrome.storage.local.set({ notionToken: value });
  }, 500);

  tokenInput.addEventListener('input', (e) => {
    saveToken(e.target.value);
  });

  // Auto-save on input for database ID (with debounce)
  const saveDbId = debounce((value) => {
    chrome.storage.local.set({ notionDbId: value });
  }, 500);

  dbIdInput.addEventListener('input', (e) => {
    saveDbId(e.target.value);
  });

  document.getElementById('templateBtn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://xmadao.notion.site/2e239ae0855e81eaa378d66b6f195bba?v=2e239ae0855e8131ba55000cc41e544f&source=copy_link' });
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const token = tokenInput.value;
    const dbId = dbIdInput.value;
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;

    if (!token || !dbId) {
      status.style.color = 'red';
      status.textContent = '请填写所有字段';
      return;
    }

    status.textContent = '';

    chrome.storage.local.set({
      notionToken: token,
      notionDbId: dbId
    }, () => {
      saveBtn.textContent = '已保存!';
      saveBtn.style.backgroundColor = '#2d862d';

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
        status.textContent = '';
      }, 2000);
    });
  });
});