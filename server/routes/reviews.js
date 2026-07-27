const express = require('express');
const router = express.Router();
const { saveDb, queryAll } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

// 辅助函数：将 sql.js 查询结果的行映射为评价对象
function rowToReview(row) {
  return {
    id: row[0],
    user_id: row[1],
    canteen_id: row[2],
    rating: row[3],
    content: row[4],
    created_at: row[5],
    username: row[6] || '匿名用户',
  };
}

// ============================================================
// GET / —— 获取评价列表（支持分页 + 按食堂筛选）
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const canteenId = req.query.canteen_id ? parseInt(req.query.canteen_id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // 构建参数化 WHERE 子句
    const conditions = [];
    const params = [];
    if (canteenId) {
      conditions.push('r.canteen_id = ?');
      params.push(canteenId);
    }
    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countResult = queryAll(db, 'SELECT COUNT(*) FROM reviews r ' + whereClause, params);
    const total = countResult[0]?.values[0][0] || 0;

    // 查询分页数据，按 created_at 倒序
    const result = queryAll(db, `
      SELECT r.id, r.user_id, r.canteen_id, r.rating, r.content, r.created_at, u.username
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const rows = result[0]?.values || [];
    const reviews = rows.map(rowToReview);

    res.json({
      code: 200,
      data: { reviews, total, page, limit },
      message: 'success',
    });
  } catch (err) {
    console.error('获取评价列表失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// GET /:id —— 获取单条评价详情
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    const result = queryAll(db,
      'SELECT r.id, r.user_id, r.canteen_id, r.rating, r.content, r.created_at, u.username FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?',
      [id]
    );

    if (!result[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      });
    }

    res.json({
      code: 200,
      data: rowToReview(result[0].values[0]),
      message: 'success',
    });
  } catch (err) {
    console.error('获取评价详情失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// POST / —— 提交新评价（需登录）
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const { canteen_id, content, rating } = req.body;

    // ---------- 参数验证 ----------
    if (!canteen_id) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'canteen_id 必填',
      });
    }
    const canteenIdNum = parseInt(canteen_id, 10);
    if (isNaN(canteenIdNum)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'canteen_id 必须为整数',
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评价内容不能为空',
      });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 500) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评价内容为 1-500 字',
      });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '评分为 1-5 的整数',
      });
    }

    // ---------- 插入数据库 ----------
    const user_id = req.user.id;
    db.run(
      'INSERT INTO reviews (user_id, canteen_id, rating, content) VALUES (?, ?, ?, ?)',
      [user_id, canteenIdNum, ratingNum, trimmedContent]
    );
    saveDb();

    // 查询刚插入的完整数据
    const newResult = queryAll(db,
      'SELECT r.id, r.user_id, r.canteen_id, r.rating, r.content, r.created_at, u.username FROM reviews r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.id DESC LIMIT 1'
    );
    const newReview = newResult[0]?.values?.length
      ? rowToReview(newResult[0].values[0])
      : null;

    res.status(201).json({
      code: 201,
      data: newReview,
      message: '评价成功',
    });
  } catch (err) {
    console.error('提交评价失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// PUT /:id —— 修改评价（需登录 + 本人）
// ============================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const { content, rating } = req.body;

    // ---------- 检查评价是否存在 ----------
    const existResult = queryAll(db,
      'SELECT id, user_id FROM reviews WHERE id = ?',
      [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此评价',
      });
    }

    // ---------- 构建动态 UPDATE ----------
    const updates = [];
    const params = [];

    if (content !== undefined) {
      const trimmed = String(content).trim();
      if (trimmed.length < 1 || trimmed.length > 500) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '评价内容为 1-500 字',
        });
      }
      updates.push('content = ?');
      params.push(trimmed);
    }

    if (rating !== undefined) {
      const num = parseInt(rating, 10);
      if (isNaN(num) || num < 1 || num > 5) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '评分为 1-5 的整数',
        });
      }
      updates.push('rating = ?');
      params.push(num);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供要更新的字段（content 或 rating）',
      });
    }

    params.push(id);
    db.run(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDb();

    // 查询更新后的完整数据
    const updatedResult = queryAll(db,
      'SELECT r.id, r.user_id, r.canteen_id, r.rating, r.content, r.created_at, u.username FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?',
      [id]
    );
    const updatedReview = updatedResult[0]?.values?.length
      ? rowToReview(updatedResult[0].values[0])
      : null;

    res.json({
      code: 200,
      data: updatedReview,
      message: '修改成功',
    });
  } catch (err) {
    console.error('修改评价失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// DELETE /:id —— 删除评价（需登录 + 本人）
// ============================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    // ---------- 检查评价是否存在 ----------
    const existResult = queryAll(db,
      'SELECT id, user_id FROM reviews WHERE id = ?',
      [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '评价不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权删除此评价',
      });
    }

    // ---------- 删除 ----------
    db.run('DELETE FROM reviews WHERE id = ?', [id]);
    saveDb();

    res.json({
      code: 200,
      data: null,
      message: '删除成功',
    });
  } catch (err) {
    console.error('删除评价失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

module.exports = router;