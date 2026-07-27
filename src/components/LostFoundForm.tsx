import { useState, useRef } from 'react'
import { API, apiRequest } from '../api'

// ============================================================
// Toast 提示组件
// ============================================================
interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

function Toast({ message, type, visible }: ToastProps) {
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {message}
      </div>
    </div>
  )
}

// ============================================================
// 表单数据类型
// ============================================================
interface FormData {
  type: '丢失' | '捡到' | ''
  title: string
  location: string
  date: string
  description: string
}

interface FormErrors {
  type: string
  title: string
  location: string
  date: string
  description: string
}

interface LostFoundFormProps {
  onSuccess?: (data: { type: '丢失' | '捡到'; title: string; location: string; date: string }) => void
}

const MAX_DESC_LENGTH = 200

// ============================================================
// 主组件
// ============================================================
export default function LostFoundForm({ onSuccess }: LostFoundFormProps) {
  // ---------- 表单状态 ----------
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormData>({
    type: '',
    title: '',
    location: '',
    date: today,
    description: '',
  })

  // ---------- 验证状态 ----------
  const [errors, setErrors] = useState<FormErrors>({
    type: '',
    title: '',
    location: '',
    date: '',
    description: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ---------- 提交状态 ----------
  const [submitting, setSubmitting] = useState(false)

  // ---------- Toast 状态 ----------
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }

  // ---------- 表单操作 ----------
  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ---------- 单个字段验证 ----------
  const validateField = (field: keyof FormData, value: string): string => {
    switch (field) {
      case 'type':
        if (!value) return '请选择类型'
        return ''
      case 'title':
        if (!value.trim()) return '请输入物品名称'
        if (value.trim().length < 2) return '物品名称至少2个字'
        if (value.trim().length > 20) return '物品名称不超过20个字'
        return ''
      case 'location':
        if (!value.trim()) return '请输入地点'
        return ''
      case 'date':
        if (!value) return '请选择日期'
        return ''
      case 'description':
        if (!value.trim()) return '请输入描述'
        if (value.trim().length < 5) return '描述至少5个字'
        if (value.trim().length > MAX_DESC_LENGTH) return `描述不超过${MAX_DESC_LENGTH}个字`
        return ''
      default:
        return ''
    }
  }

  // ---------- 失焦验证 ----------
  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const err = validateField(field, form[field])
    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  // ---------- 全量验证 ----------
  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      type: validateField('type', form.type),
      title: validateField('title', form.title),
      location: validateField('location', form.location),
      date: validateField('date', form.date),
      description: validateField('description', form.description),
    }
    setErrors(newErrors)
    setTouched({ type: true, title: true, location: true, date: true, description: true })

    return Object.values(newErrors).every((e) => !e)
  }

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!validateAll()) {
      showToast('请填写完整信息', 'error')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        location: form.location.trim(),
        date: form.date,
        description: form.description.trim(),
      }

      console.log('提交失物招领：', payload)

      await apiRequest(API.lostFound, 'POST', payload)

      // 成功
      showToast('发布成功！', 'success')
      setForm({ type: '', title: '', location: '', date: today, description: '' })
      setErrors({ type: '', title: '', location: '', date: '', description: '' })
      setTouched({})
      onSuccess?.({
        type: payload.type as '丢失' | '捡到',
        title: payload.title,
        location: payload.location,
        date: payload.date,
      })
    } catch {
      showToast('发布失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- 渲染 ----------
  const inputClass = (field: keyof FormData) =>
    `w-full px-4 py-2.5 bg-white border text-sm rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow ${
      touched[field] && errors[field] ? 'border-red-400' : 'border-gray-200'
    }`

  return (
    <>
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <div className="max-w-[640px] mx-auto">
        {/* 标题 */}
        <h2 className="text-xl font-bold text-gray-800 mb-6">发布失物招领</h2>

        {/* ---------- 类型 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            类型 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-0">
            {(['丢失', '捡到'] as const).map((opt) => {
              const isActive = form.type === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    updateField('type', opt)
                    if (touched.type) {
                      setErrors((prev) => ({ ...prev, type: '' }))
                    }
                  }}
                  onBlur={() => handleBlur('type')}
                  className={`px-5 py-2 text-sm font-medium transition-colors focus:outline-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm z-10'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${
                    opt === '丢失'
                      ? 'rounded-l-lg border-r border-white/20'
                      : 'rounded-r-lg'
                  }`}
                >
                  {opt === '丢失' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      丢失
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      捡到
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {touched.type && errors.type && (
            <p className="mt-1.5 text-xs text-red-500">{errors.type}</p>
          )}
        </div>

        {/* ---------- 物品名称 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            物品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            placeholder="请输入物品名称"
            maxLength={20}
            className={inputClass('title')}
          />
          {touched.title && errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* ---------- 地点 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            地点 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            onBlur={() => handleBlur('location')}
            placeholder="如：图书馆二楼"
            className={inputClass('location')}
          />
          {touched.location && errors.location && (
            <p className="mt-1 text-xs text-red-500">{errors.location}</p>
          )}
        </div>

        {/* ---------- 日期 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => updateField('date', e.target.value)}
            onBlur={() => handleBlur('date')}
            className={inputClass('date')}
          />
          {touched.date && errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date}</p>
          )}
        </div>

        {/* ---------- 描述 ---------- */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            描述 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              placeholder="请详细描述物品特征、颜色、品牌等信息"
              rows={4}
              maxLength={MAX_DESC_LENGTH}
              className={`${inputClass('description')} resize-none pr-16`}
            />
            <span className="absolute bottom-2.5 right-3 text-xs text-gray-400 select-none">
              {form.description.length}/{MAX_DESC_LENGTH}
            </span>
          </div>
          {touched.description && errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description}</p>
          )}
        </div>

        {/* ---------- 提交按钮 ---------- */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${
            submitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              发布中...
            </span>
          ) : (
            '发布信息'
          )}
        </button>
      </div>
    </>
  )
}