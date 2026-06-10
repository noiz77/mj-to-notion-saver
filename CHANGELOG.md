# Changelog

本项目采用语义化版本号：`主版本.次版本.修订版本`。

## [1.1.1] - 2026-06-10

### Fixed

- 修复部分 Notion API 响应下保存成功后未显示“打开页面”按钮的问题。
- 增加页面 ID 后备链接，并兼容 `notion.com` 页面域名。

## [1.1.0] - 2026-06-10

### Added

- 保存成功后支持直接打开新建的 Notion 页面。
- 支持 Nijijourney 图片保存。
- 支持粘贴 Notion 数据库链接并自动提取 Database ID。
- 保存配置前验证 Integration Token 和数据库连接。
- 弹窗底部显示当前扩展版本。

### Changed

- 优化 Notion 配置流程及错误提示。
- 成功、加载和失败状态使用一致的按钮反馈。

## [1.0.0] - 2026-01-13

### Added

- 支持将 Midjourney 图片、Prompt、Parameters、原图链接和生成时间保存到 Notion 数据库。
