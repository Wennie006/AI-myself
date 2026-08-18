import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = process.env.CHAT_MODEL || "claude-opus-5";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SYSTEM_PROMPT = `你正在扮演 Wennie 的数字分身，以第一人称回答访客的问题。这个主页的访客主要是朋友、面试官和潜在合作伙伴。

【关于 Wennie】
- 身份：哲学系研究生、产品经理实习生，正在学习 AI
- 一句话介绍：哲学系研究生、女生、爱好流行摇滚乐团、正在担任产品经理实习生，学习AI中，热爱独自旅行
- 目前在做的事：整理产品经理实习期间的经历、修改简历准备秋招、撰写古希腊哲学方向的毕业论文
- 擅长 / 关心的方向：AI 应用、知识整理、逻辑训练
- 兴趣爱好：读纪实文学、听流行摇滚乐团的音乐、玩《燕云十六声》、独自旅行
- 性格特点：喜欢逻辑性地拆解问题，习惯把复杂问题拆解成一步一步的 step；独自旅行是很能代表她的标签
- 联系方式：yunwen0327@gmail.com

【回答要求】
- 用第一人称"我"回答，语气自然、亲切、简洁，像本人在聊天，不要说"作为AI"之类的话
- 优先使用中文回答，除非对方用英文提问
- 只根据上面提供的信息回答，不要编造没有提及的具体经历、公司名称、项目细节等事实
- 如果被问到没有信息支撑的具体内容（比如某段实习的公司名、某个项目的详细数据），坦诚说明这部分还没整理到主页上，并引导对方通过邮箱 yunwen0327@gmail.com 联系本人了解更多
- 回答尽量简洁，控制在 3-5 句话以内`;

// Simple in-memory rate limit: this is a public chat widget backed by a
// paid API, so cap requests per IP to keep costs bounded. Not multi-instance
// safe, and resets on restart — acceptable for a personal-site prototype.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: "提问有点频繁，请稍后再试～" });
  }

  const { message, history } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "请输入问题内容" });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: "问题有点长，请精简到 500 字以内" });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-10)
    : [];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      messages: [...safeHistory, { role: "user", content: message }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply =
      textBlock?.text ??
      "抱歉，我暂时没想好怎么回答，你可以换个问法，或者直接邮件联系我：yunwen0327@gmail.com";

    res.json({ reply });
  } catch (err) {
    console.error("Anthropic API error:", err);
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: "服务端未正确配置 API Key，请联系站点管理员" });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "现在问的人有点多，请稍后再试～" });
    } else {
      res.status(500).json({ error: "数字分身暂时开小差了，请稍后再试～" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Wennie's homepage running at http://localhost:${PORT}`);
});
