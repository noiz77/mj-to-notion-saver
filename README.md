# MJ to Notion Saver

一键将 Midjourney 的图片及其提示词（Prompt）保存到 Notion 数据库。

## ✨ 特点介绍

- **极速保存**：点击 "Save to Notion" 按钮，瞬间归档。
- **智能解析**：自动分离 Prompt 与 Parameters，保持数据结构化。
- **完整溯源**：同时保存高清原图直链与生成时间。

<img src="screenshots/readme_demo.png" alt="使用示例" width="100%">

## 📥 如何安装

1. **加载插件**：
   - 打开 Chrome 扩展管理页 `chrome://extensions/`。
   - 开启右上角 "开发者模式"。
   - 点击 "加载已解压的扩展程序"，选择本项目文件夹。

2. **配置插件**：
   - 点击浏览器工具栏的插件图标。
   - 填入你的 Notion `Integration Token` 和 `Database ID`。

## 🛠️ Notion 准备

为了让插件正常工作，请在 Notion 中完成以下 3 步：

1. **获取 Token**：
   - 前往 [My Integrations](https://www.notion.so/my-integrations) 创建新集成，复制 `Internal Integration Secret`。

2. **准备数据库**：
   - ⚡️ **懒人包**：你可以直接复制此 [Notion 模板](https://xmadao.notion.site/2e239ae0855e81eaa378d66b6f195bba?v=2e239ae0855e8131ba55000cc41e544f&source=copy_link) 到你的工作区（点击页面右上角 Duplicate）。
   - 或者手动新建 Database，并在列中包含以下属性（**列名与类型需严格一致**）：
     - `Name` (Title)
     - `Parameters` (Text)
     - `URL` (URL)
     - `Date` (Date)

3. **连接集成**：
   - 在数据库页面点击右上角 `...` -> `Connect to` (或 `Connections`) -> 添加第一步创建的 Integration。
   - 复制数据库 URL 中 `notion.so/` 后的 32 位字符作为 `Database ID`。

## ❓ 常见问题

- **Q: 页面上没看到保存按钮？**
  - A: 请确保你点开了图片的**大图/灯箱模式**。如果还没有，请刷新页面重试。

- **Q: 提示 "Notion API Error"？**
  - A: 最常见原因是**未在数据库页面连接 Integration**。其次请检查 Token 是否正确，以及数据库的列名是否完全匹配。

## 🔒 隐私声明

本插件所有代码开源且透明。数据仅流向用户配置的 Notion 接口，不经过任何第三方服务器，且配置信息仅存储于本地浏览器。
