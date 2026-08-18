# AI-myself

一个名叫 Wennie 的数字人个人主页：头像/一句话介绍、个人信息展示区、项目经历，以及一个接入 Claude API 的数字分身聊天区。

## 本地运行

```bash
npm install
cp .env.example .env   # 然后把 ANTHROPIC_API_KEY 换成你自己的 key
npm start
```

打开 http://localhost:3000 即可预览，聊天区会真实调用 Claude API 回答。

如果你还没有 Anthropic API key，去 https://console.anthropic.com 创建一个。

## 项目结构

- `index.html` — 前端页面（头像/介绍、个人信息、项目经历、聊天 UI），纯静态，无需构建
- `server.js` — 一个很小的 Express 服务：托管 `index.html`，并提供 `POST /api/chat` 接口，把访客消息转发给 Claude API（数字分身的人设写在这个文件的 `SYSTEM_PROMPT` 里）
- `.env.example` — 环境变量模板（`ANTHROPIC_API_KEY`、可选的 `PORT` / `CHAT_MODEL`）

## 关于聊天区

- 默认模型是 `claude-opus-5`；如果这是公开页面、担心访客较多产生的调用成本，可以在 `.env` 里设置 `CHAT_MODEL=claude-haiku-4-5` 换成更便宜的模型。
- 后端对每个 IP 做了简单的限流（每小时 20 次），避免被刷。这是内存级别的限制，重启服务会重置，仅适合个人主页这种小流量场景。
- 数字分身只会依据 `SYSTEM_PROMPT` 里提供的信息回答，遇到没有信息支撑的具体问题（比如某段实习的公司名）会引导访客发邮件联系，不会编造。

## 部署

这是一个普通的 Node.js 服务（`npm start` 启动），可以部署到任意支持 Node 的平台，例如 Render、Railway、Fly.io 等：设置好 `ANTHROPIC_API_KEY` 环境变量，启动命令用 `npm start` 即可。

## 待补充

- `index.html` 里的「项目经历」区目前是占位内容，需要替换成真实的项目信息。
