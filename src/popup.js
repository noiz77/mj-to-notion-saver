document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token');
  const dbUrlInput = document.getElementById('dbUrl');
  const dbStatus = document.getElementById('dbStatus');

  function extractNotionDatabaseId(value) {
    const input = value.trim();
    const uuidPattern = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/ig;

    if (/^[0-9a-f]{32}$/i.test(input) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
      return input.replace(/-/g, '').toLowerCase();
    }

    let url;
    try {
      url = new URL(input);
    } catch (err) {
      try {
        url = new URL(`https://${input}`);
      } catch (fallbackErr) {
        return null;
      }
    }

    if (!/(\.|^)notion\.(so|site)$/i.test(url.hostname)) {
      return null;
    }

    const matches = url.pathname.match(uuidPattern);
    if (!matches) {
      return null;
    }

    return matches[matches.length - 1].replace(/-/g, '').toLowerCase();
  }

  function updateDatabaseFromInput(value, persist = true) {
    const dbId = extractNotionDatabaseId(value);

    if (!value.trim()) {
      dbStatus.textContent = '';
      if (persist) {
        chrome.storage.local.remove(['notionDbId', 'notionDbUrl']);
      }
      return null;
    }

    if (!dbId) {
      dbStatus.style.color = '#c0392b';
      dbStatus.textContent = '请输入有效的 Notion 数据库链接';
      if (persist) {
        chrome.storage.local.remove(['notionDbId', 'notionDbUrl']);
      }
      return null;
    }

    dbStatus.textContent = '';

    if (persist) {
      chrome.storage.local.set({
        notionDbId: dbId,
        notionDbUrl: value.trim()
      });
    }

    return dbId;
  }

  function isLikelyNotionToken(token) {
    return /^secret_[A-Za-z0-9_-]+$/.test(token.trim()) || /^ntn_[A-Za-z0-9_-]+$/.test(token.trim());
  }

  async function validateNotionDatabase(token, dbId) {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (response.ok) {
      return;
    }

    const result = await response.json().catch(() => ({}));
    let message = result.message || '无法验证 Notion 数据库链接';

    if (response.status === 401 || result.code === 'unauthorized') {
      message = 'Integration Token 无效，请检查是否复制了正确的 Internal Integration Secret';
    }

    if (result.code === 'object_not_found') {
      message = '没有找到该数据库，请确认链接是 Database 页面，并已在 Connections 中添加 Integration';
    }

    throw new Error(message);
  }

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
  chrome.storage.local.get(['notionToken', 'notionDbId', 'notionDbUrl'], (items) => {
    if (items.notionToken) tokenInput.value = items.notionToken;
    if (items.notionDbUrl || items.notionDbId) {
      dbUrlInput.value = items.notionDbUrl || items.notionDbId;
      updateDatabaseFromInput(dbUrlInput.value, false);
    }
  });

  // Auto-save on input for token (with debounce)
  const saveToken = debounce((value) => {
    chrome.storage.local.set({ notionToken: value });
  }, 500);

  tokenInput.addEventListener('input', (e) => {
    saveToken(e.target.value);
  });

  // Auto-save database ID extracted from the Notion database URL
  const saveDbId = debounce((value) => {
    updateDatabaseFromInput(value);
  }, 500);

  dbUrlInput.addEventListener('input', (e) => {
    saveDbId(e.target.value);
  });

  document.getElementById('templateBtn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://xmadao.notion.site/2e239ae0855e81eaa378d66b6f195bba?v=2e239ae0855e8131ba55000cc41e544f&source=copy_link' });
  });

  document.getElementById('integrationsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.notion.so/my-integrations' });
  });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const dbId = updateDatabaseFromInput(dbUrlInput.value);
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;

    if (!token || !dbId) {
      status.style.color = 'red';
      status.textContent = !token ? '请填写 Integration Token' : '请粘贴有效的 Notion 数据库链接';
      return;
    }

    if (!isLikelyNotionToken(token)) {
      status.style.color = 'red';
      status.textContent = 'Integration Token 格式不正确，请粘贴以 secret_ 或 ntn_ 开头的 Token';
      return;
    }

    status.textContent = '';
    saveBtn.textContent = '验证中...';
    saveBtn.disabled = true;

    try {
      await validateNotionDatabase(token, dbId);
    } catch (err) {
      status.style.color = 'red';
      status.textContent = err.message;
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
      return;
    }

    chrome.storage.local.set({
      notionToken: token,
      notionDbId: dbId,
      notionDbUrl: dbUrlInput.value.trim()
    }, () => {
      saveBtn.textContent = '已保存!';
      saveBtn.disabled = false;
      saveBtn.style.backgroundColor = '#2d862d';

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
        status.textContent = '';
      }, 2000);
    });
  });
});
