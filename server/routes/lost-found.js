const express = require('express');
const router = express.Router();
const { saveDb, queryAll } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

// 辅助函数：将 sql.js 查询结果的行映射为失物招领对象
function rowToItem(row) {
  return {
    id: row[0],
    user_id: row[1],
    type: row[2],
    title: row[3],
    location: row[4] || '',
    date: row[5] || '',
    description: row[6] || '',
    status: row[7],
    created_at: row[8],
  };
}

// 允许的类型
const ALLOWED_TYPES = ['丢失', '捡到'];

// ============================================================
// GET / —— 获取列表（支持类型筛选、关键词搜索、分页）
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const type = req.query.type || '';
    const keyword = (req.query.keyword || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // 构建 WHERE 条件（参数化查询）
    const conditions = [];
    const params = [];
    if (type && ALLOWED_TYPES.includes(type)) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
      params.push(pattern, pattern, pattern);
    }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countResult = await queryAll(db, `SELECT COUNT(*) FROM lost_found ${whereClause}`, params);
    const total = countResult[0]?.values[0][0] || 0;

    // 查询分页数据，按 created_at 倒序
    const fullSql = `
      SELECT id, user_id, type, title, location, date, description, status, created_at
      FROM lost_found
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    const result = await queryAll(db, fullSql, [...params, limit, offset]);

    const rows = result[0]?.values || [];
    const items = rows.map(rowToItem);

    res.json({
      code: 200,
      data: { items, total, page, limit },
      message: 'success',
    });
  } catch (err) {
    console.error('获取失物招领列表失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// GET /:id —— 获取详情
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    const result = await queryAll(
      db,
      'SELECT id, user_id, type, title, location, date, description, status, created_at FROM lost_found WHERE id = ?',
      [id]
    );

    if (!result[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      });
    }

    res.json({
      code: 200,
      data: rowToItem(result[0].values[0]),
      message: 'success',
    });
  } catch (err) {
    console.error('获取失物招领详情失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// POST / —— 发布信息（需登录）
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const { type, title, location, date, description } = req.body;

    // ---------- 参数验证 ----------
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '类型必须为"丢失"或"捡到"',
      });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '标题不能为空',
      });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 30) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '标题为 2-30 字',
      });
    }

    const trimmedDesc = (description || '').trim();
    if (!trimmedDesc) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '描述不能为空',
      });
    }
    if (trimmedDesc.length > 500) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '描述不超过 500 字',
      });
    }

    // ---------- 插入数据库 ----------
    const user_id = req.user.id;
    const loc = (location || '').trim();
    const dt = date || '';

    db.run(
      'INSERT INTO lost_found (user_id, type, title, location, date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, type, trimmedTitle, loc, dt, trimmedDesc]
    );
    saveDb();

    // 查询刚插入的完整数据
    const newResult = await queryAll(
      db,
      'SELECT id, user_id, type, title, location, date, description, status, created_at FROM lost_found ORDER BY id DESC LIMIT 1'
    );
    const newItem = newResult[0]?.values?.length
      ? rowToItem(newResult[0].values[0])
      : null;

    res.status(201).json({
      code: 201,
      data: newItem,
      message: '发布成功',
    });
  } catch (err) {
    console.error('发布失物招领失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// PUT /:id —— 修改信息（需登录 + 本人）
// ============================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const { type, title, location, date, description } = req.body;

    // ---------- 检查是否存在 ----------
    const existResult = await queryAll(
      db,
      'SELECT id, user_id FROM lost_found WHERE id = ?',
      [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此信息',
      });
    }

    // ---------- 构建动态 UPDATE ----------
    const updates = [];
    const params = [];

    if (type !== undefined) {
      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '类型必须为"丢失"或"捡到"',
        });
      }
      updates.push('type = ?');
      params.push(type);
    }

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '标题为 2-30 字',
        });
      }
      updates.push('title = ?');
      params.push(trimmed);
    }

    if (location !== undefined) {
      updates.push('location = ?');
      params.push(String(location).trim());
    }

    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }

    if (description !== undefined) {
      const trimmed = String(description).trim();
      if (trimmed.length > 500) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '描述不超过 500 字',
        });
      }
      updates.push('description = ?');
      params.push(trimmed);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供要更新的字段',
      });
    }

    params.push(id);
    db.run(`UPDATE lost_found SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDb();

    // 查询更新后的完整数据
    const updatedResult = await queryAll(
      db,
      'SELECT id, user_id, type, title, location, date, description, status, created_at FROM lost_found WHERE id = ?',
      [id]
    );
    const updatedItem = updatedResult[0]?.values?.length
      ? rowToItem(updatedResult[0].values[0])
      : null;

    res.json({
      code: 200,
      data: updatedItem,
      message: '修改成功',
    });
  } catch (err) {
    console.error('修改失物招领失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// DELETE /:id —— 删除信息（需登录 + 本人，真删除）
// ============================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    // ---------- 检查是否存在 ----------
    const existResult = await queryAll(
      db,
      'SELECT id, user_id FROM lost_found WHERE id = ?',
      [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '信息不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权删除此信息',
      });
    }

    // ---------- 真删除 ----------
    db.run('DELETE FROM lost_found WHERE id = ?', [id]);
    saveDb();

    res.json({
      code: 200,
      data: null,
      message: '删除成功',
    });
  } catch (err) {
    console.error('删除失物招领失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

module.exports = router;