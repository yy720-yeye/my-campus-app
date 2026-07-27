const express = require('express');
const router = express.Router();

// GET / 返回所有食堂数据（从数据库读取）
router.get('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();

    const result = db.exec('SELECT id, name, location, rating, tags FROM canteens ORDER BY id');
    const rows = result[0]?.values || [];

    const canteens = rows.map((row) => ({
      id: row[0],
      name: row[1],
      location: row[2],
      rating: row[3],
      tags: JSON.parse(row[4] || '[]'),
    }));

    res.json({
      code: 200,
      data: canteens,
      message: 'success',
    });
  } catch (err) {
    console.error('获取食堂数据失败:', err.message);
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    });
  }
});

module.exports = router;