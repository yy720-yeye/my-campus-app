const express = require('express');
const router = express.Router();
const { saveDb, queryAll } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

// 辅助函数：将 sql.js 查询结果的行映射为商品对象
function rowToItem(row) {
  return {
    id: row[0],
    user_id: row[1],
    title: row[2],
    price: row[3],
    category: row[4],
    description: row[5] || '',
    contact: row[6] || '',
    images: row[7] ? JSON.parse(row[7]) : [],
    status: row[8],
    created_at: row[9],
    username: row[10] || '匿名用户',
  };
}

// 允许的分类
const ALLOWED_CATEGORIES = ['教材', '电子', '生活', '其他'];

// ============================================================
// GET / —— 获取商品列表（支持搜索、筛选、分页）
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const keyword = (req.query.keyword || '').trim();
    const category = req.query.category || '';
    const status = req.query.status || 'active';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // 构建 WHERE 条件（参数化查询）
    const conditions = [];
    const params = [];
    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category && ALLOWED_CATEGORIES.includes(category)) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 查询总数
    const countResult = await queryAll(db, `SELECT COUNT(*) FROM items i ${whereClause}`, params);
    const total = countResult[0]?.values[0][0] || 0;

    // 查询分页数据
    const fullSql = `
      SELECT i.id, i.user_id, i.title, i.price, i.category, i.description, i.contact, i.images, i.status, i.created_at, u.username
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC, i.id DESC
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
    console.error('获取商品列表失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// GET /:id —— 获取商品详情（含发布者用户名）
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    const result = await queryAll(db, `
      SELECT i.id, i.user_id, i.title, i.price, i.category, i.description, i.contact, i.images, i.status, i.created_at,
             u.username
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [id]);

    if (!result[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      });
    }

    const row = result[0].values[0];
    const item = rowToItem(row);
    item.username = row[10] || null;

    res.json({
      code: 200,
      data: item,
      message: 'success',
    });
  } catch (err) {
    console.error('获取商品详情失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

// ============================================================
// POST / —— 发布新商品（需登录）
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const { title, description, price, category, images, contact } = req.body;

    // ---------- 参数验证 ----------
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '商品标题不能为空',
      });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 30) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '商品标题为 2-30 字',
      });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '价格不能为空',
      });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '价格必须大于 0',
      });
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '分类必须为：教材、电子、生活、其他',
      });
    }

    // ---------- 插入数据库 ----------
    const user_id = req.user.id;
    const desc = (description || '').trim();
    const contactStr = (contact || '').trim();
    const imagesStr = Array.isArray(images) ? JSON.stringify(images) : '[]';

    db.run(
      'INSERT INTO items (user_id, title, price, category, description, contact, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, trimmedTitle, priceNum, category, desc, contactStr, imagesStr]
    );
    saveDb();

    // 查询刚插入的完整数据
    const newResult = await queryAll(db,
      'SELECT id, user_id, title, price, category, description, contact, images, status, created_at FROM items ORDER BY id DESC LIMIT 1'
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
    console.error('发布商品失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// PUT /:id —— 修改商品（需登录 + 本人）
// ============================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const { title, description, price, category, status, contact, images } = req.body;

    // ---------- 检查商品是否存在 ----------
    const existResult = await queryAll(db,
      'SELECT id, user_id FROM items WHERE id = ?', [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权修改此商品',
      });
    }

    // ---------- 构建动态 UPDATE ----------
    const updates = [];
    const params = [];

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '商品标题为 2-30 字',
        });
      }
      updates.push('title = ?');
      params.push(trimmed);
    }

    if (price !== undefined) {
      const num = parseFloat(price);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '价格必须大于 0',
        });
      }
      updates.push('price = ?');
      params.push(num);
    }

    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '分类必须为：教材、电子、生活、其他',
        });
      }
      updates.push('category = ?');
      params.push(category);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(String(description).trim());
    }

    if (contact !== undefined) {
      updates.push('contact = ?');
      params.push(String(contact).trim());
    }

    if (images !== undefined) {
      updates.push('images = ?');
      params.push(Array.isArray(images) ? JSON.stringify(images) : '[]');
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '请提供要更新的字段',
      });
    }

    params.push(id);
    db.run(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDb();

    // 查询更新后的完整数据
    const updatedResult = await queryAll(db,
      'SELECT id, user_id, title, price, category, description, contact, images, status, created_at FROM items WHERE id = ?', [id]
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
    console.error('修改商品失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

// ============================================================
// DELETE /:id —— 下架商品（需登录 + 本人，软删除：status → sold）
// ============================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    // ---------- 检查商品是否存在 ----------
    const existResult = await queryAll(db,
      'SELECT id, user_id FROM items WHERE id = ?', [id]
    );
    if (!existResult[0]?.values?.length) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '商品不存在',
      });
    }

    // ---------- 检查权限 ----------
    if (existResult[0].values[0][1] !== req.user.id) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权下架此商品',
      });
    }

    // ---------- 软删除 ----------
    db.run('UPDATE items SET status = ? WHERE id = ?', ['sold', id]);
    saveDb();

    res.json({
      code: 200,
      data: null,
      message: '下架成功',
    });
  } catch (err) {
    console.error('下架商品失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败',
    });
  }
});

module.exports = router;