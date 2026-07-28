/**
 * 课程表路由
 * 提供课表数据的 CRUD 操作和教务系统导入功能
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// ============================================================
// 辅助函数：将 queryAll 返回的 rows 转换为课程对象数组
// ============================================================
function parseCourses(result) {
  const rows = result[0]?.values || [];
  return rows.map((row) => ({
    id: row[0],
    user_id: row[1],
    course_name: row[2],
    teacher: row[3] || '',
    classroom: row[4] || '',
    day_of_week: row[5],
    start_time: row[6] || '',
    end_time: row[7] || '',
    semester: row[8] || '',
    reminder_enabled: row[9] === 0 ? 0 : 1,
    reminder_minutes: row[10] || 15,
    weeks: JSON.parse(row[11] || '[]'),
    color: row[12] || '',
    created_at: row[13] || '',
  }));
}

// ============================================================
// GET /api/schedules - 获取当前用户的全部课程
// ============================================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { getDb, queryAll } = req.app.get('db');
    const db = await getDb();

    const result = queryAll(
      db,
      `SELECT id, user_id, course_name, teacher, classroom,
              day_of_week, start_time, end_time, semester,
              reminder_enabled, reminder_minutes, weeks, color, created_at
       FROM courses
       WHERE user_id = ?
       ORDER BY day_of_week, start_time`,
      [req.user.id]
    );

    const courses = parseCourses(result);

    res.json({ code: 200, data: courses, message: 'success' });
  } catch (err) {
    console.error('获取课程数据失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '数据库查询失败' });
  }
});

// ============================================================
// POST /api/schedules - 添加一门课程（需登录）
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { course_name, teacher, classroom, day_of_week, start_time, end_time,
            semester, reminder_enabled, reminder_minutes, weeks, color } = req.body;

    if (!course_name || !course_name.trim()) {
      return res.json({ code: 400, data: null, message: '课程名称不能为空' });
    }
    if (!day_of_week || day_of_week < 1 || day_of_week > 7) {
      return res.json({ code: 400, data: null, message: '请选择正确的星期（1-7）' });
    }

    const { getDb, saveDb, queryAll } = req.app.get('db');
    const db = await getDb();

    const weeksStr = weeks ? JSON.stringify(weeks) : '[]';
    const currentSemester = semester || '2025-2026-2';

    db.run(
      `INSERT INTO courses (user_id, course_name, teacher, classroom, day_of_week,
                            start_time, end_time, semester, reminder_enabled,
                            reminder_minutes, weeks, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        course_name.trim(),
        teacher || '',
        classroom || '',
        day_of_week,
        start_time || '',
        end_time || '',
        currentSemester,
        reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : 1,
        reminder_minutes || 15,
        weeksStr,
        color || '',
      ]
    );
    saveDb();

    // 获取新插入的 ID
    const lastId = db.exec('SELECT last_insert_rowid() as id');
    const newId = lastId[0]?.values[0]?.[0];

    // 重新查询完整数据
    const result = queryAll(
      db,
      `SELECT id, user_id, course_name, teacher, classroom,
              day_of_week, start_time, end_time, semester,
              reminder_enabled, reminder_minutes, weeks, color, created_at
       FROM courses WHERE id = ?`,
      [newId]
    );
    const courses = parseCourses(result);

    res.json({ code: 200, data: courses[0], message: '课程添加成功' });
  } catch (err) {
    console.error('添加课程失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '添加课程失败' });
  }
});

// ============================================================
// POST /api/schedules/import - 从教务系统导入课表（模拟）
// ============================================================
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { semester } = req.body;
    const currentSemester = semester || '2025-2026-2';

    // 检查是否已导入过该学期的课程
    const { getDb, saveDb, queryAll } = req.app.get('db');
    const db = await getDb();

    const existing = queryAll(
      db,
      'SELECT COUNT(*) as count FROM courses WHERE user_id = ? AND semester = ?',
      [req.user.id, currentSemester]
    );
    if (existing[0]?.values[0]?.[0] > 0) {
      return res.json({ code: 200, data: { imported: 0, message: '该学期课程已导入，无需重复导入' }, message: 'success' });
    }

    // 模拟教务系统返回的课表数据（汉语国际教育专业）
    const defaultWeeks = JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
    const importCourses = [
      { course_name: '现代汉语', teacher: '张教授', classroom: '教学楼A201', day_of_week: 1, start_time: '08:00', end_time: '09:40', color: '#4F46E5' },
      { course_name: '大学英语', teacher: '李老师', classroom: '教学楼B302', day_of_week: 1, start_time: '10:00', end_time: '11:40', color: '#059669' },
      { course_name: '对外汉语教学法', teacher: '孙老师', classroom: '教学楼B201', day_of_week: 1, start_time: '14:00', end_time: '15:40', color: '#D97706' },
      { course_name: '古代文学', teacher: '王教授', classroom: '教学楼A103', day_of_week: 2, start_time: '08:00', end_time: '09:40', color: '#DC2626' },
      { course_name: '中国文化概论', teacher: '刘教授', classroom: '教学楼A103', day_of_week: 2, start_time: '10:00', end_time: '11:40', color: '#7C3AED' },
      { course_name: '语言学概论', teacher: '赵教授', classroom: '教学楼A301', day_of_week: 3, start_time: '08:00', end_time: '09:40', color: '#0891B2' },
      { course_name: '现当代文学', teacher: '陈教授', classroom: '教学楼A201', day_of_week: 3, start_time: '14:00', end_time: '15:40', color: '#E11D48' },
      { course_name: '书法与篆刻', teacher: '周老师', classroom: '艺术楼201', day_of_week: 4, start_time: '08:00', end_time: '09:40', color: '#65A30D' },
      { course_name: '大学英语', teacher: '李老师', classroom: '教学楼B302', day_of_week: 4, start_time: '10:00', end_time: '11:40', color: '#059669' },
      { course_name: '现代汉语', teacher: '张教授', classroom: '教学楼A201', day_of_week: 4, start_time: '14:00', end_time: '15:40', color: '#4F46E5' },
      { course_name: '古代文学', teacher: '王教授', classroom: '教学楼A103', day_of_week: 5, start_time: '08:00', end_time: '09:40', color: '#DC2626' },
      { course_name: '现当代文学', teacher: '陈教授', classroom: '教学楼A201', day_of_week: 5, start_time: '10:00', end_time: '11:40', color: '#E11D48' },
    ];

    for (const c of importCourses) {
      db.run(
        `INSERT INTO courses (user_id, course_name, teacher, classroom, day_of_week,
                              start_time, end_time, semester, reminder_enabled,
                              reminder_minutes, weeks, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 15, ?, ?)`,
        [
          req.user.id,
          c.course_name,
          c.teacher,
          c.classroom,
          c.day_of_week,
          c.start_time,
          c.end_time,
          currentSemester,
          defaultWeeks,
          c.color,
        ]
      );
    }
    saveDb();

    res.json({
      code: 200,
      data: { imported: importCourses.length, message: `成功导入 ${importCourses.length} 门课程` },
      message: 'success',
    });
  } catch (err) {
    console.error('导入课程失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '导入课程失败' });
  }
});

// ============================================================
// PUT /api/schedules/:id - 更新一门课程
// ============================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const { course_name, teacher, classroom, day_of_week, start_time, end_time,
            semester, reminder_enabled, reminder_minutes, weeks, color } = req.body;

    if (!course_name || !course_name.trim()) {
      return res.json({ code: 400, data: null, message: '课程名称不能为空' });
    }

    const { getDb, saveDb, queryAll } = req.app.get('db');
    const db = await getDb();

    // 验证课程归属
    const ownerCheck = queryAll(
      db,
      'SELECT user_id FROM courses WHERE id = ?',
      [courseId]
    );
    if (!ownerCheck[0]?.values?.length) {
      return res.status(404).json({ code: 404, data: null, message: '课程不存在' });
    }
    if (ownerCheck[0].values[0][0] !== req.user.id) {
      return res.status(403).json({ code: 403, data: null, message: '无权修改此课程' });
    }

    const weeksStr = weeks ? JSON.stringify(weeks) : '[]';

    db.run(
      `UPDATE courses SET course_name = ?, teacher = ?, classroom = ?,
           day_of_week = ?, start_time = ?, end_time = ?, semester = ?,
           reminder_enabled = ?, reminder_minutes = ?, weeks = ?, color = ?
       WHERE id = ?`,
      [
        course_name.trim(),
        teacher || '',
        classroom || '',
        day_of_week,
        start_time || '',
        end_time || '',
        semester || '',
        reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : 1,
        reminder_minutes || 15,
        weeksStr,
        color || '',
        courseId,
      ]
    );
    saveDb();

    // 返回更新后的数据
    const result = queryAll(
      db,
      `SELECT id, user_id, course_name, teacher, classroom,
              day_of_week, start_time, end_time, semester,
              reminder_enabled, reminder_minutes, weeks, color, created_at
       FROM courses WHERE id = ?`,
      [courseId]
    );
    const courses = parseCourses(result);

    res.json({ code: 200, data: courses[0], message: '课程更新成功' });
  } catch (err) {
    console.error('更新课程失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '更新课程失败' });
  }
});

// ============================================================
// PUT /api/schedules/:id/reminder - 更新课程提醒设置
// ============================================================
router.put('/:id/reminder', authMiddleware, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const { reminder_enabled, reminder_minutes } = req.body;

    const { getDb, saveDb, queryAll } = req.app.get('db');
    const db = await getDb();

    // 验证课程归属
    const ownerCheck = queryAll(
      db,
      'SELECT user_id FROM courses WHERE id = ?',
      [courseId]
    );
    if (!ownerCheck[0]?.values?.length) {
      return res.status(404).json({ code: 404, data: null, message: '课程不存在' });
    }
    if (ownerCheck[0].values[0][0] !== req.user.id) {
      return res.status(403).json({ code: 403, data: null, message: '无权修改此课程' });
    }

    db.run(
      'UPDATE courses SET reminder_enabled = ?, reminder_minutes = ? WHERE id = ?',
      [
        reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : 1,
        reminder_minutes || 15,
        courseId,
      ]
    );
    saveDb();

    res.json({ code: 200, data: null, message: '提醒设置已更新' });
  } catch (err) {
    console.error('更新提醒设置失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '更新提醒设置失败' });
  }
});

// ============================================================
// DELETE /api/schedules/:id - 删除一门课程
// ============================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);

    const { getDb, saveDb, queryAll } = req.app.get('db');
    const db = await getDb();

    // 验证课程归属
    const ownerCheck = queryAll(
      db,
      'SELECT user_id FROM courses WHERE id = ?',
      [courseId]
    );
    if (!ownerCheck[0]?.values?.length) {
      return res.status(404).json({ code: 404, data: null, message: '课程不存在' });
    }
    if (ownerCheck[0].values[0][0] !== req.user.id) {
      return res.status(403).json({ code: 403, data: null, message: '无权删除此课程' });
    }

    db.run('DELETE FROM courses WHERE id = ?', [courseId]);
    saveDb();

    res.json({ code: 200, data: null, message: '课程已删除' });
  } catch (err) {
    console.error('删除课程失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '删除课程失败' });
  }
});

module.exports = router;