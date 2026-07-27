/**
 * AI 路由
 *
 * 接口一：POST /api/ai/summarize-reviews          — 食堂评价 AI 总结
 * 接口二：GET  /api/ai/review-summary              — 食堂评价详细总结（旧版，保留兼容）
 * 接口三：POST /api/ai/generate-item-description   — 二手商品描述 AI 生成（含类别）
 * 接口四：POST /api/ai/generate-description         — 二手商品描述 AI 生成（简洁版）
 */

const express = require('express');
const router = express.Router();
const { queryAll } = require('../database/connection');

// ---------- DeepSeek API 配置 ----------
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 15000;

// ============================================================
// POST /summarize-reviews — 生成食堂评价的 AI 总结
// 请求体：{ canteen_id: 1 }
// ============================================================
router.post('/summarize-reviews', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const { canteen_id } = req.body;

    // ---------- 参数校验 ----------
    if (!canteen_id) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供 canteen_id',
      });
    }

    const canteenId = parseInt(canteen_id, 10);
    if (isNaN(canteenId)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'canteen_id 必须为整数',
      });
    }

    // ---------- 1. 查询食堂信息 ----------
    const canteenResult = db.exec(
      `SELECT id, name FROM canteens WHERE id = ${canteenId}`
    );
    if (!canteenResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '食堂不存在',
      });
    }

    const canteenName = canteenResult[0].values[1];

    // ---------- 2. 查询最近 20 条评价 ----------
    const reviewsResult = db.exec(`
      SELECT r.rating, r.content
      FROM reviews r
      WHERE r.canteen_id = ${canteenId}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 20
    `);

    const reviews = (reviewsResult[0]?.values || []).map((row) => ({
      rating: row[0],
      content: row[1],
    }));

    // 无评价时直接返回
    if (reviews.length === 0) {
      return res.json({
        code: 200,
        data: { summary: '该食堂暂无评价' },
        message: 'success',
      });
    }

    // ---------- 3. 检查 API Key ----------
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务未配置，请联系管理员',
      });
    }

    // ---------- 4. 拼接评价文本 ----------
    const reviewText = reviews
      .map((r) => `评分${r.rating}星：${r.content}`)
      .join('\n');

    // ---------- 5. 构造 Prompt ----------
    const systemPrompt =
      '你是一个校园生活助手。请根据以下食堂评价，用3句话总结：\n' +
      '第1句：整体口碑如何（学生们普遍满意还是有怨言）\n' +
      '第2句：最受欢迎或最常被提到的菜品是什么\n' +
      '第3句：价格水平如何\n' +
      '\n' +
      '请直接输出3句话总结，不要加标题和编号。每句话不超过40字。';

    const userPrompt = `以下是食堂评价：\n${reviewText}`;

    // ---------- 6. 调用 DeepSeek API（带超时） ----------
    console.log(`[AI] 正在为食堂 #${canteenId} 生成评价总结...`);

    const apiUrl = `${DEEPSEEK_API_BASE}/v1/chat/completions`;

    // 使用 AbortController 实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] DeepSeek API 错误: ${response.status} ${errorText}`);
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    const aiResult = await response.json();
    const summary = (aiResult.choices?.[0]?.message?.content || '').trim();

    console.log(`[AI] 食堂 #${canteenId} 评价总结生成成功`);

    // ---------- 7. 返回结果 ----------
    res.json({
      code: 200,
      data: { summary },
      message: 'success',
    });
  } catch (err) {
    // 超时处理
    if (err.name === 'AbortError') {
      console.error('[AI] 请求超时');
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    console.error('[AI] 评价总结生成失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI服务暂时不可用，请稍后重试',
    });
  }
});

// ============================================================
// GET /review-summary — 评价总结（旧版，保留兼容）
// ============================================================
router.get('/review-summary', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const canteenId = parseInt(req.query.canteen_id, 10);
    if (!canteenId || isNaN(canteenId)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供有效的 canteen_id',
      });
    }

    // ---------- 1. 查询食堂信息 ----------
    const canteenResult = db.exec(
      `SELECT id, name, location, rating, tags FROM canteens WHERE id = ${canteenId}`
    );
    if (!canteenResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '食堂不存在',
      });
    }

    const canteenRow = canteenResult[0].values[0];
    const canteen = {
      id: canteenRow[0],
      name: canteenRow[1],
      location: canteenRow[2],
      rating: canteenRow[3],
      tags: JSON.parse(canteenRow[4] || '[]'),
    };

    // ---------- 2. 查询所有评价 ----------
    const reviewsResult = db.exec(`
      SELECT r.id, r.rating, r.content, r.created_at, u.username
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.canteen_id = ${canteenId}
      ORDER BY r.created_at DESC
    `);

    const reviews = (reviewsResult[0]?.values || []).map((row) => ({
      id: row[0],
      rating: row[1],
      content: row[2],
      created_at: row[3],
      username: row[4] || '匿名用户',
    }));

    if (reviews.length === 0) {
      return res.json({
        code: 200,
        data: {
          canteen_name: canteen.name,
          summary: '该食堂暂无评价，无法生成总结。',
          rating_avg: 0,
          review_count: 0,
        },
        message: 'success',
      });
    }

    // ---------- 3. 检查 API Key ----------
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        code: 500,
        data: null,
        message: '未配置 DEEPSEEK_API_KEY，请在 .env 中设置',
      });
    }

    // ---------- 4. 计算统计指标 ----------
    const ratings = reviews.map((r) => r.rating);
    const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);

    // ---------- 5. 构建 Prompt ----------
    const reviewTexts = reviews
      .map((r, i) => `[评价${i + 1}] 评分：${r.rating}/5，内容：${r.content}`)
      .join('\n');

    const systemPrompt = `你是一位校园生活助手，擅长总结用户对食堂的评价。请根据以下评价数据，生成一份简洁、客观的食堂评价总结。

总结要求：
1. 总评：用一句话概括整体评价趋势（好评居多还是差评居多）
2. 优点：列出用户提到最多的 2-3 个优点
3. 不足：列出用户提到最多的 1-2 个不足
4. 推荐菜品/窗口：如果有用户提到具体菜品或窗口，列举出来
5. 总体评分：${avgRating}/5

格式要求：
- 使用简洁的段落，不要使用列表符号
- 语言亲切自然，适合学生阅读
- 总字数控制在 150 字以内`;

    const userPrompt = `以下是对"${canteen.name}"（位于${canteen.location}）的${reviews.length}条评价数据：

${reviewTexts}

请生成食堂评价总结。`;

    // ---------- 6. 调用 DeepSeek API（带超时） ----------
    console.log(`[AI] 正在为食堂 #${canteenId} 生成评价总结...`);

    const apiUrl = `${DEEPSEEK_API_BASE}/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] DeepSeek API 错误: ${response.status} ${errorText}`);
      return res.status(502).json({
        code: 502,
        data: null,
        message: 'AI 服务调用失败',
      });
    }

    const aiResult = await response.json();
    const summary = aiResult.choices?.[0]?.message?.content?.trim() || '';

    console.log(`[AI] 食堂 #${canteenId} 评价总结生成成功`);

    // ---------- 7. 返回结果 ----------
    res.json({
      code: 200,
      data: {
        canteen_name: canteen.name,
        canteen_location: canteen.location,
        summary,
        rating_avg: parseFloat(avgRating),
        review_count: reviews.length,
      },
      message: 'success',
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI] 请求超时');
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI 服务暂时不可用，请稍后重试',
      });
    }
    console.error('[AI] 评价总结生成失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI 服务异常: ' + err.message,
    });
  }
});

// ============================================================
// POST /generate-item-description — 生成二手商品描述的 AI 推荐
// 请求体：{ name, category, price, condition, description }
// ============================================================
router.post('/generate-item-description', async (req, res) => {
  try {
    const { name, category, price, condition, description } = req.body;

    // ---------- 参数校验 ----------
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供商品名称',
      });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供商品类别',
      });
    }

    // ---------- 检查 API Key ----------
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务未配置，请联系管理员',
      });
    }

    // ---------- 构造 Prompt ----------
    const systemPrompt =
      '你是一个校园二手交易平台的商品描述助手。请根据用户提供的商品信息，生成一段简洁、吸引人的商品描述。\n' +
      '\n' +
      '要求：\n' +
      '1. 语言亲切自然，适合学生间的二手交易\n' +
      '2. 突出商品的核心卖点和优势\n' +
      '3. 说明商品的成色和使用情况\n' +
      '4. 提及价格优势（如果有）\n' +
      '5. 总字数控制在 80-150 字\n' +
      '6. 直接输出描述文本，不要加标题、编号或引导语，不要进行任何推理分析';

    let userPrompt = `商品名称：${name.trim()}\n类别：${category.trim()}`;
    if (price) userPrompt += `\n价格：${price}`;
    if (condition) userPrompt += `\n成色：${condition}`;
    if (description && description.trim()) userPrompt += `\n用户描述：${description.trim()}`;
    userPrompt += '\n\n请直接输出商品描述：';

    // ---------- 调用 DeepSeek API（带超时） ----------
    console.log(`[AI] 正在为商品"${name}"生成描述...`);

    const apiUrl = `${DEEPSEEK_API_BASE}/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] DeepSeek API 错误: ${response.status} ${errorText}`);
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    const aiResult = await response.json();
    const generatedDescription = (aiResult.choices?.[0]?.message?.content || '').trim();

    console.log(`[AI] 商品"${name}"描述生成成功`);

    // ---------- 返回结果 ----------
    res.json({
      code: 200,
      data: { description: generatedDescription },
      message: 'success',
    });
  } catch (err) {
    // 超时处理
    if (err.name === 'AbortError') {
      console.error('[AI] 请求超时');
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    console.error('[AI] 商品描述生成失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI服务暂时不可用，请稍后重试',
    });
  }
});

// ============================================================
// POST /generate-description — 生成二手商品描述（简洁版）
// 请求体：{ title, condition, price, usage }
// ============================================================
router.post('/generate-description', async (req, res) => {
  try {
    const { title, condition, price, usage } = req.body;

    // ---------- 参数校验 ----------
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供商品名称',
      });
    }

    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供商品价格',
      });
    }

    // ---------- 检查 API Key ----------
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务未配置，请联系管理员',
      });
    }

    // ---------- 构造 Prompt ----------
    const systemPrompt =
      '你是一个校园二手交易平台的助手。请根据用户提供的商品信息，生成一段吸引人的商品描述。\n' +
      '\n' +
      '要求：\n' +
      '- 语气活泼、亲切，符合大学生风格\n' +
      '- 突出商品的核心卖点\n' +
      '- 提到原价和现价的对比（如果价格合理的话）\n' +
      '- 适当使用emoji\n' +
      '- 长度控制在50-100字\n' +
      '- 直接输出描述文案，不要加标题';

    let userContent = `商品名称：${title.trim()}`;
    if (condition && condition.trim()) userContent += `\n成色：${condition.trim()}`;
    userContent += `\n售价：${price}元`;
    if (usage && usage.trim()) userContent += `\n使用情况：${usage.trim()}`;

    // ---------- 调用 DeepSeek API（带超时） ----------
    console.log(`[AI] 正在为商品"${title}"生成简洁描述...`);

    const apiUrl = `${DEEPSEEK_API_BASE}/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] DeepSeek API 错误: ${response.status} ${errorText}`);
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    const aiResult = await response.json();
    const generatedDescription = (aiResult.choices?.[0]?.message?.content || '').trim();

    console.log(`[AI] 商品"${title}"简洁描述生成成功`);

    // ---------- 返回结果 ----------
    res.json({
      code: 200,
      data: { description: generatedDescription },
      message: 'success',
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI] 请求超时');
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'AI服务暂时不可用，请稍后重试',
      });
    }

    console.error('[AI] 商品简洁描述生成失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'AI服务暂时不可用，请稍后重试',
    });
  }
});

module.exports = router;