import { useState, useEffect, useCallback } from 'react'
import { apiRequest, API, buildUrl } from '../api'
import type { Course } from '../utils/courseReminder'
import { startReminderService, stopReminderService, updateReminderCourses, requestNotificationPermission } from '../utils/courseReminder'

// ============================================================
// 常量定义
// ============================================================

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8
  return `${hour.toString().padStart(2, '0')}:00`
})

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const ROW_HEIGHT = 72 // 每行高度（px）
const ROW_GAP = 2     // 行间距

// 课程颜色预设
const PRESET_COLORS = [
  '#4F46E5', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#0891B2', '#E11D48', '#65A30D',
  '#0D9488', '#9333EA', '#2563EB', '#EA580C',
]

// ============================================================
// 工具函数
// ============================================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function timeToOffset(time: string): number {
  return timeToMinutes(time) - timeToMinutes('08:00')
}

function getCurrentWeek(): number {
  const semesterStart = new Date('2026-02-23')
  const today = new Date()
  const diffMs = today.getTime() - semesterStart.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 20))
}

// ============================================================
// 课程编辑弹窗组件
// ============================================================

interface CourseModalProps {
  open: boolean
  course: Partial<Course> | null
  onClose: () => void
  onSave: (data: Partial<Course>) => void
}

function CourseModal({ open, course, onClose, onSave }: CourseModalProps) {
  const [form, setForm] = useState({
    course_name: '',
    teacher: '',
    classroom: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:40',
    reminder_enabled: 1,
    reminder_minutes: 15,
    color: PRESET_COLORS[0],
  })

  useEffect(() => {
    if (course) {
      setForm({
        course_name: course.course_name || '',
        teacher: course.teacher || '',
        classroom: course.classroom || '',
        day_of_week: course.day_of_week || 1,
        start_time: course.start_time || '08:00',
        end_time: course.end_time || '09:40',
        reminder_enabled: course.reminder_enabled ?? 1,
        reminder_minutes: course.reminder_minutes || 15,
        color: course.color || PRESET_COLORS[0],
      })
    } else {
      setForm({
        course_name: '',
        teacher: '',
        classroom: '',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '09:40',
        reminder_enabled: 1,
        reminder_minutes: 15,
        color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      })
    }
  }, [course, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.course_name.trim()) return
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {course?.id ? '编辑课程' : '添加课程'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 课程名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">课程名称 *</label>
            <input
              type="text"
              value={form.course_name}
              onChange={(e) => setForm({ ...form, course_name: e.target.value })}
              placeholder="例如：现代汉语"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* 教师 + 教室 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">教师</label>
              <input
                type="text"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                placeholder="张教授"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">教室</label>
              <input
                type="text"
                value={form.classroom}
                onChange={(e) => setForm({ ...form, classroom: e.target.value })}
                placeholder="教学楼A201"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 星期 + 时间 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">星期</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {DAY_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 提醒设置 */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">课前提醒</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.reminder_enabled === 1}
                  onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked ? 1 : 0 })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {form.reminder_enabled === 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">提前</span>
                <select
                  value={form.reminder_minutes}
                  onChange={(e) => setForm({ ...form, reminder_minutes: parseInt(e.target.value) })}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value={5}>5 分钟</option>
                  <option value={10}>10 分钟</option>
                  <option value={15}>15 分钟</option>
                  <option value={30}>30 分钟</option>
                  <option value={60}>60 分钟</option>
                </select>
                <span className="text-sm text-gray-600">提醒</span>
              </div>
            )}
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">课程颜色</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={!form.course_name.trim()}
            >
              {course?.id ? '保存修改' : '添加课程'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// 教务系统导入弹窗
// ============================================================

function ImportModal({
  open,
  onClose,
  onImport,
  importing,
}: {
  open: boolean
  onClose: () => void
  onImport: () => void
  importing: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* 图标 */}
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">从教务系统导入课表</h2>
          <p className="text-sm text-center text-gray-500 mb-6">
            将自动导入汉语国际教育专业本学期（2025-2026-2）的课程安排
          </p>

          {importing ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">正在连接教务系统，请稍候...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1.5">
                <p className="font-medium text-gray-800 mb-2">即将导入以下课程：</p>
                <p>• 现代汉语（周一 08:00-09:40）</p>
                <p>• 大学英语（周一 10:00-11:40）</p>
                <p>• 对外汉语教学法（周一 14:00-15:40）</p>
                <p>• 古代文学（周二 08:00-09:40）</p>
                <p>• 中国文化概论（周二 10:00-11:40）</p>
                <p>• 语言学概论（周三 08:00-09:40）</p>
                <p>• 现当代文学（周三 14:00-15:40）</p>
                <p>• 书法与篆刻（周四 08:00-09:40）</p>
                <p>• 现代汉语（周四 14:00-15:40）</p>
                <p>• 古代文学（周五 08:00-09:40）</p>
                <p>• 现当代文学（周五 10:00-11:40）</p>
                <p className="text-gray-400 mt-1">共 12 门课程</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 主页面组件
// ============================================================

export default function SchedulePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifGranted, setNotifGranted] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [currentWeek] = useState(getCurrentWeek)
  const [toastMsg, setToastMsg] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  // 获取课程数据
  const fetchCourses = useCallback(async () => {
    try {
      const res = await apiRequest<Course[]>(API.schedules, 'GET')
      if (res.code === 200) {
        setCourses(res.data)
        updateReminderCourses(res.data)
      }
    } catch (err: any) {
      if (err?.code === 401) {
        setError('请先登录后查看课表')
      } else {
        setError('加载课表失败')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // 启动提醒服务
  useEffect(() => {
    if (courses.length > 0) {
      startReminderService(courses)
      setNotifGranted(Notification.permission === 'granted')
    }
    return () => stopReminderService()
  }, [courses.length > 0]) // 只在有课程数据时启动

  // Toast 提示
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // 请求通知权限
  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
    if (granted) {
      showToast('✅ 提醒已开启，课程开始前将通知您')
    } else {
      showToast('⚠️ 通知权限被拒绝，请到浏览器设置中允许')
    }
  }

  // 导入课表
  const handleImport = async () => {
    setImporting(true)
    // 模拟教务系统连接延迟
    await new Promise((r) => setTimeout(r, 1500))
    try {
      const res = await apiRequest<{ imported: number; message: string }>(buildUrl(API.schedules + '/import'), 'POST')
      if (res.code === 200 && res.data) {
        showToast(`✅ ${res.data.message}`)
        setShowImportModal(false)
        fetchCourses()
      }
    } catch (err: any) {
      showToast('❌ 导入失败：' + (err?.message || '未知错误'))
    } finally {
      setImporting(false)
    }
  }

  // 保存课程（新增或编辑）
  const handleSaveCourse = async (data: Partial<Course>) => {
    try {
      if (editingCourse?.id) {
        // 编辑
        const res = await apiRequest(buildUrl(`${API.schedules}/${editingCourse.id}`), 'PUT', data as any)
        if (res.code === 200) {
          showToast('✅ 课程已更新')
          setShowCourseModal(false)
          setEditingCourse(null)
          fetchCourses()
        }
      } else {
        // 新增
        const res = await apiRequest(API.schedules, 'POST', data as any)
        if (res.code === 200) {
          showToast('✅ 课程已添加')
          setShowCourseModal(false)
          fetchCourses()
        }
      }
    } catch (err: any) {
      showToast('❌ 操作失败：' + (err?.message || '未知错误'))
    }
  }

  // 删除课程
  const handleDelete = async (course: Course) => {
    if (!confirm(`确定要删除「${course.course_name}」吗？`)) return
    try {
      const res = await apiRequest(buildUrl(`${API.schedules}/${course.id}`), 'DELETE')
      if (res.code === 200) {
        showToast('✅ 课程已删除')
        setSelectedCourse(null)
        fetchCourses()
      }
    } catch (err: any) {
      showToast('❌ 删除失败：' + (err?.message || '未知错误'))
    }
  }

  // 切换提醒
  const handleToggleReminder = async (course: Course) => {
    const newEnabled = course.reminder_enabled ? 0 : 1
    try {
      const res = await apiRequest(buildUrl(`${API.schedules}/${course.id}/reminder`), 'PUT', {
        reminder_enabled: newEnabled,
        reminder_minutes: course.reminder_minutes,
      })
      if (res.code === 200) {
        showToast(newEnabled ? '🔔 提醒已开启' : '🔕 提醒已关闭')
        fetchCourses()
      }
    } catch (err: any) {
      showToast('❌ 操作失败')
    }
  }

  // 计算课程在网格中的位置
  const getCourseStyle = (course: Course) => {
    const topOffset = timeToOffset(course.start_time)
    const endOffset = timeToOffset(course.end_time)
    const height = Math.max(endOffset - topOffset, 30) // 最小高度
    const top = (topOffset / 60) * (ROW_HEIGHT + ROW_GAP)
    const h = (height / 60) * (ROW_HEIGHT + ROW_GAP) - ROW_GAP
    return { top, height: h }
  }

  // 按星期分组课程
  const coursesByDay = DAY_NAMES.map((_, idx) =>
    courses.filter((c) => c.day_of_week === idx + 1)
  )

  // 未登录状态
  if (error && error.includes('请先登录')) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">请先登录</h2>
          <p className="text-gray-500 mb-6">登录后即可查看和管理你的课表</p>
          <a
            href="/auth"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            前往登录
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ===== 顶部操作栏 ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">课表管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            2025-2026 学年第二学期 · 第 {currentWeek} 周
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 通知权限按钮 */}
          <button
            onClick={handleRequestNotif}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              notifGranted
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifGranted ? '提醒已开启' : '开启提醒'}
          </button>

          {/* 导入按钮 */}
          <button
            onClick={() => {
              const token = localStorage.getItem('token')
              if (!token) {
                showToast('⚠️ 请先登录后再导入课程')
                return
              }
              setShowImportModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            教务系统导入
          </button>

          {/* 手动添加按钮 */}
          <button
            onClick={() => {
              const token = localStorage.getItem('token')
              if (!token) {
                showToast('⚠️ 请先登录后再添加课程')
                return
              }
              setEditingCourse(null)
              setShowCourseModal(true)
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加课程
          </button>
        </div>
      </div>

      {/* ===== 课表网格 ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">暂无课程数据</h3>
          <p className="text-sm text-gray-400 mb-6">点击上方「教务系统导入」一键导入本学期课表，或手动添加课程</p>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            导入课表
          </button>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
          {/* 课表头部：星期 */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-gray-200">
            <div className="p-2 text-center text-xs text-gray-400 font-medium border-r border-gray-100 bg-gray-50/50">
              时间
            </div>
            {DAY_NAMES.map((name, idx) => {
              const today = new Date().getDay() || 7
              const isToday = today === idx + 1
              return (
                <div
                  key={idx}
                  className={`p-2 text-center text-xs font-medium border-r border-gray-100 last:border-r-0 ${
                    isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50/50 text-gray-600'
                  }`}
                >
                  {name}
                </div>
              )
            })}
          </div>

          {/* 课表主体 */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] relative">
            {/* 时间列 */}
            <div className="border-r border-gray-100">
              {TIME_SLOTS.map((time, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-400 pr-2 text-right"
                  style={{ height: ROW_HEIGHT + ROW_GAP, lineHeight: ROW_HEIGHT + 'px' }}
                >
                  {time}
                </div>
              ))}
            </div>

            {/* 每日列 */}
            {coursesByDay.map((dayCourses, dayIdx) => (
              <div
                key={dayIdx}
                className="relative border-r border-gray-100 last:border-r-0 min-h-[600px]"
              >
                {/* 时间分隔线 */}
                {TIME_SLOTS.map((_, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-50"
                    style={{ height: ROW_HEIGHT + ROW_GAP }}
                  />
                ))}

                {/* 课程卡片 */}
                {dayCourses.map((course) => {
                  const pos = getCourseStyle(course)
                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourse(selectedCourse?.id === course.id ? null : course)}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] z-10 group"
                      style={{
                        top: pos.top + 'px',
                        height: pos.height + 'px',
                        backgroundColor: course.color + '20',
                        borderLeft: `3px solid ${course.color}`,
                      }}
                    >
                      <div className="text-xs font-bold truncate" style={{ color: course.color }}>
                        {course.course_name}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate leading-tight">
                        {course.teacher && `${course.teacher} `}
                        {course.classroom && `· ${course.classroom}`}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {course.start_time} - {course.end_time}
                      </div>

                      {/* 提醒状态指示器 */}
                      {course.reminder_enabled === 1 && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}

                      {/* 悬浮操作按钮 */}
                      <div className="absolute top-0.5 right-1 hidden group-hover:flex gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingCourse(course)
                            setShowCourseModal(true)
                          }}
                          className="w-5 h-5 bg-white/90 rounded flex items-center justify-center hover:bg-white shadow-sm"
                          title="编辑"
                        >
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(course)
                          }}
                          className="w-5 h-5 bg-white/90 rounded flex items-center justify-center hover:bg-white shadow-sm"
                          title="删除"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 课程详情面板（选中课程后显示） ===== */}
      {selectedCourse && (
        <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-10 rounded" style={{ backgroundColor: selectedCourse.color }} />
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedCourse.course_name}</h3>
                <p className="text-sm text-gray-500">
                  {DAY_NAMES[selectedCourse.day_of_week - 1]} · {selectedCourse.start_time} - {selectedCourse.end_time}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">教师</p>
              <p className="text-sm font-medium text-gray-700">{selectedCourse.teacher || '未指定'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">教室</p>
              <p className="text-sm font-medium text-gray-700">{selectedCourse.classroom || '未指定'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">学期</p>
              <p className="text-sm font-medium text-gray-700">{selectedCourse.semester || '未指定'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">上课周次</p>
              <p className="text-sm font-medium text-gray-700">
                {selectedCourse.weeks?.length > 0
                  ? `第 ${selectedCourse.weeks[0]}-${selectedCourse.weeks[selectedCourse.weeks.length - 1]} 周`
                  : '未指定'}
              </p>
            </div>
          </div>

          {/* 提醒设置 */}
          <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700">课程提醒</p>
                <p className="text-xs text-gray-500">
                  {selectedCourse.reminder_enabled
                    ? `提前 ${selectedCourse.reminder_minutes} 分钟提醒`
                    : '已关闭'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggleReminder(selectedCourse)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCourse.reminder_enabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {selectedCourse.reminder_enabled ? '关闭提醒' : '开启提醒'}
            </button>
          </div>
        </div>
      )}

      {/* ===== 弹窗 ===== */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        importing={importing}
      />

      <CourseModal
        open={showCourseModal}
        course={editingCourse}
        onClose={() => {
          setShowCourseModal(false)
          setEditingCourse(null)
        }}
        onSave={handleSaveCourse}
      />

      {/* ===== Toast 提示 ===== */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm animate-[fadeInUp_0.3s_ease-out]">
          {toastMsg}
        </div>
      )}
    </div>
  )
}