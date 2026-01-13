chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToNotion") {
    chrome.storage.local.get(['notionToken', 'notionDbId'], (config) => {
      if (!config.notionToken || !config.notionDbId) {
        console.error("Notion config missing!");
        sendResponse({ success: false, error: "请先点击插件图标配置 Notion Token" });
        return;
      }

      savePageToNotion(request.data, config.notionToken, config.notionDbId)
        .then(res => sendResponse({ success: true, data: res }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
});

async function savePageToNotion(data, token, dbId) {
  const { imageUrl, prompt, parameters, timestamp } = data;

  const titleText = (prompt || "").replace(/[\p{Extended_Pictographic}]/gu, '').trim();

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      cover: {
        type: "external",
        external: { url: imageUrl }
      },
      properties: {
        "Name": {
          title: [
            {
              text: {
                content: titleText.slice(0, 50) + (titleText.length > 50 ? "..." : "")
              }
            }
          ]
        },
        "Parameters": {
          rich_text: [{ text: { content: parameters || "" } }]
        },
        "URL": {
          url: imageUrl
        },
        "Date": {
          date: { start: timestamp }
        }
      },
      children: [
        {
          object: "block",
          type: "embed",
          embed: {
            url: imageUrl
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Original Image Link ↗" },
                annotations: { bold: true, color: "blue" },
                text: {
                  content: "Original Image Link ↗",
                  link: { url: imageUrl }
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: prompt + (parameters ? " " + parameters : "")
                }
              }
            ]
          }
        },
        
      ]
    })
  });

  const resJson = await response.json();

  if (!response.ok) {
    let msg = resJson.message || resJson.code || "Notion API Error";

    if (msg.includes("shared with your integration") || resJson.code === 'object_not_found') {
      msg += " 【请注意：你需要去 Notion 数据库页面的右上角菜单 -> Connections -> 添加你的 Integration】";
    }

    if (msg.includes("property")) {
      msg += " 【请检查 Database 是否缺少 'Parameters'(Text), 'URL'(URL) 或 'Date'(Date) 列，或者列名不匹配】";
    }
    throw new Error(msg);
  }

  return resJson;
}