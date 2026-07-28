/**
 * 课程提醒服务
 *
 * 在浏览器中运行，定期检查当前时间与课程时间的匹配，
 * 在课程开始前指定分钟数时弹出浏览器通知。
 *
 * 使用方式：
 *   import { startReminderService, stopReminderService } from '../utils/courseReminder'
 *   startReminderService(courses)  // 传入课程数组开始监控
 *   stopReminderService()           // 停止监控
 */

// 课程数据类型（与后端返回一致）
export interface Course {
  id: number;
  user_id: number;
  course_name: string;
  teacher: string;
  classroom: string;
  day_of_week: number; // 1=周一, 7=周日
  start_time: string;  // 'HH:mm'
  end_time: string;    // 'HH:mm'
  semester: string;
  reminder_enabled: number; // 0 或 1
  reminder_minutes: number; // 提前提醒分钟数
  weeks: number[];    // 上课周次 [1,2,3,...]
  color: string;
  created_at: string;
}

// ---- 内部状态 ----
let intervalId: ReturnType<typeof setInterval> | null = null;
let cachedCourses: Course[] = [];
let notifiedToday = new Set<string>(); // 记录已通知过的课程，格式 "courseId_day"
let lastCheckedDay = ''; // 上次检查的日期，用于跨天重置

// 检查浏览器是否支持通知
function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

// 请求通知权限
async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// 发送通知
function sendNotification(course: Course, minutesLeft: number): void {
  if (!isNotificationSupported()) return;

  const title = '⏰ 课程提醒';
  const body = `「${course.course_name}」将在 ${minutesLeft} 分钟后开始\n` +
    `地点：${course.classroom || '未指定'} | 教师：${course.teacher || '未指定'}`;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `course-${course.id}-${getTodayKey()}`, // 相同 tag 不会重复弹窗
      requireInteraction: true, // 保持通知直到用户点击
    });

    // 点击通知跳转到课表页面
    notification.onclick = () => {
      window.focus();
      window.location.href = '/schedule';
      notification.close();
    };
  } catch (e) {
    console.error('[课程提醒] 发送通知失败:', e);
  }
}

// 获取今天的日期键 'YYYY-MM-DD'
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// 获取当前周次（基于学期起始周计算）
// 2025-2026-2 学期假设从 2026-02-23（周一）开始
function getCurrentWeek(): number {
  const semesterStart = new Date('2026-02-23');
  const today = new Date();
  const diffMs = today.getTime() - semesterStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(week, 20)); // 限制在 1-20 周
}

// 解析时间字符串 'HH:mm' 为分钟数（从午夜开始）
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// 核心检查逻辑
function checkReminders(): void {
  const todayKey = getTodayKey();

  // 跨天重置已通知列表
  if (lastCheckedDay !== todayKey) {
    notifiedToday.clear();
    lastCheckedDay = todayKey;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay() || 7; // JS: 0=周日, 1=周一... 转为 7=周日, 1=周一
  const currentWeek = getCurrentWeek();

  for (const course of cachedCourses) {
    // 检查：提醒是否开启
    if (!course.reminder_enabled) continue;

    // 检查：是否是今天
    if (course.day_of_week !== today) continue;

    // 检查：本周是否有课
    if (!course.weeks.includes(currentWeek)) continue;

    // 检查：是否已经通知过
    const notifyKey = `${course.id}_${todayKey}`;
    if (notifiedToday.has(notifyKey)) continue;

    // 计算距离课程开始还有多少分钟
    const startMin = timeToMinutes(course.start_time);
    const diffMinutes = startMin - currentMinutes;

    // 在提醒时间窗口内触发通知（允许 1 分钟误差）
    if (diffMinutes > 0 && diffMinutes <= course.reminder_minutes) {
      sendNotification(course, diffMinutes);
      notifiedToday.add(notifyKey);
    }
  }
}

// ---- 对外接口 ----

/**
 * 启动课程提醒服务
 * @param courses - 课程列表
 */
export function startReminderService(courses: Course[]): void {
  cachedCourses = courses;

  // 停止已有服务
  stopReminderService();

  // 请求通知权限（首次）
  requestPermission().then((granted) => {
    if (granted) {
      console.log('[课程提醒] 通知权限已获取');
    } else {
      console.warn('[课程提醒] 通知权限被拒绝，将无法弹出提醒');
    }
  });

  // 立即检查一次
  checkReminders();

  // 每 30 秒检查一次
  intervalId = setInterval(checkReminders, 30 * 1000);
  console.log('[课程提醒] 提醒服务已启动');
}

/**
 * 更新课程列表（在课程数据变更后调用）
 */
export function updateReminderCourses(courses: Course[]): void {
  cachedCourses = courses;
}

/**
 * 停止课程提醒服务
 */
export function stopReminderService(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[课程提醒] 提醒服务已停止');
  }
}

/**
 * 手动请求通知权限
 * 可在用户点击"开启提醒"按钮时调用
 */
export function requestNotificationPermission(): Promise<boolean> {
  return requestPermission();
}