import { useState, useRef, useCallback, useEffect } from 'react'
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
  title: string
  description: string
  price: string
  category: string
  contact: string
}

interface FormErrors {
  title: string
  description: string
  price: string
  category: string
  contact: string
}

interface PostItemFormProps {
  onSuccess?: (data: { title: string; price: number; category: string }) => void
  onCancel?: () => void
}

const CATEGORIES = ['教材', '电子', '生活', '其他']
const MAX_IMAGES = 3
const MAX_DESC_LENGTH = 500

// ============================================================
// 主组件
// ============================================================
export default function PostItemForm({ onSuccess, onCancel }: PostItemFormProps) {
  // ---------- 表单状态 ----------
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    contact: '',
  })

  // ---------- 图片状态 ----------
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 清理预览 URL
  const revokePreviews = useCallback(() => {
    previews.forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  // 组件卸载时清理
  useEffect(() => {
    return () => revokePreviews()
  }, [revokePreviews])

  // ---------- 验证状态 ----------
  const [errors, setErrors] = useState<FormErrors>({
    title: '',
    description: '',
    price: '',
    category: '',
    contact: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ---------- 提交状态 ----------
  const [submitting, setSubmitting] = useState(false)

  // ---------- AI 生成状态 ----------
  const [aiGenerating, setAiGenerating] = useState(false)

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
      case 'title':
        if (!value.trim()) return '请输入商品名称'
        if (value.trim().length < 2) return '商品名称至少2个字'
        if (value.trim().length > 30) return '商品名称不超过30个字'
        return ''
      case 'description':
        if (!value.trim()) return '请输入商品描述'
        if (value.trim().length < 10) return '描述至少10个字'
        if (value.trim().length > MAX_DESC_LENGTH) return `描述不超过${MAX_DESC_LENGTH}个字`
        return ''
      case 'price': {
        if (!value.trim()) return '请输入价格'
        const num = parseFloat(value)
        if (isNaN(num) || num <= 0) return '请输入有效的价格'
        return ''
      }
      case 'category':
        if (!value) return '请选择分类'
        return ''
      case 'contact':
        if (!value.trim()) return '请填写联系方式'
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
      title: validateField('title', form.title),
      description: validateField('description', form.description),
      price: validateField('price', form.price),
      category: validateField('category', form.category),
      contact: validateField('contact', form.contact),
    }
    setErrors(newErrors)
    // 标记所有字段已触碰
    setTouched({ title: true, description: true, price: true, category: true, contact: true })

    return Object.values(newErrors).every((e) => !e)
  }

  // ---------- 图片处理 ----------
  const addImages = (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) return

    const newFiles: File[] = []
    const newUrls: string[] = []

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      newFiles.push(file)
      newUrls.push(URL.createObjectURL(file))
    }

    setImages((prev) => [...prev, ...newFiles])
    setPreviews((prev) => [...prev, ...newUrls])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // ---------- 拖拽上传 ----------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    addImages(e.dataTransfer.files)
  }

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!validateAll()) {
      showToast('请填写完整信息', 'error')
      return
    }

    setSubmitting(true)

    try {
      // 模拟 POST 请求
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        contact: form.contact.trim(),
        images: images.map((f) => f.name),
      }

      console.log('提交数据：', payload)

      await apiRequest(API.items, 'POST', payload)

      // 成功
      showToast('发布成功！', 'success')
      setForm({ title: '', description: '', price: '', category: '', contact: '' })
      setErrors({ title: '', description: '', price: '', category: '', contact: '' })
      setTouched({})
      revokePreviews()
      setImages([])
      setPreviews([])
      onSuccess?.({ title: form.title.trim(), price: parseFloat(form.price), category: form.category })
    } catch {
      showToast('发布失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- AI 生成商品描述 ----------
  const handleAiGenerate = async () => {
    if (!form.title.trim()) {
      showToast('请先填写商品名称', 'error')
      return
    }
    if (!form.price.trim()) {
      showToast('请先填写价格', 'error')
      return
    }

    setAiGenerating(true)
    try {
      const res = await apiRequest<{ description: string }>(API.ai.generateDescription, 'POST', {
        title: form.title.trim(),
        price: form.price,
      })
      if (res.data.description) {
        setForm((prev) => ({ ...prev, description: res.data.description }))
        showToast('AI描述已生成，你可以修改后发布', 'success')
      }
    } catch {
      showToast('AI生成失败，请手动填写描述', 'error')
    } finally {
      setAiGenerating(false)
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
        <h2 className="text-xl font-bold text-gray-800 mb-6">发布二手商品</h2>

        {/* ---------- 商品名称 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            商品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            placeholder="请输入商品名称"
            maxLength={30}
            className={inputClass('title')}
          />
          {touched.title && errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* ---------- 商品描述 ---------- */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              商品描述 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiGenerating}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors border ${
                aiGenerating
                  ? 'border-purple-200 text-purple-400 cursor-not-allowed bg-purple-50'
                  : 'border-purple-300 text-purple-600 hover:bg-purple-50 active:bg-purple-100'
              }`}
            >
              {aiGenerating ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中...
                </>
              ) : (
                '🤖 AI帮我写描述'
              )}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              placeholder="请详细描述商品的使用情况、成色等"
              rows={5}
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

        {/* ---------- 价格 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            价格 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">¥</span>
            <input
              type="number"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              onBlur={() => handleBlur('price')}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`${inputClass('price')} pl-8`}
            />
          </div>
          {touched.price && errors.price && (
            <p className="mt-1 text-xs text-red-500">{errors.price}</p>
          )}
        </div>

        {/* ---------- 分类 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            分类 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            onBlur={() => handleBlur('category')}
            className={`${inputClass('category')} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10 ${
              !form.category ? 'text-gray-400' : 'text-gray-800'
            }`}
            style={{ color: form.category ? undefined : 'inherit' }}
          >
            <option value="" disabled className="text-gray-400">
              请选择分类
            </option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="text-gray-800">
                {cat}
              </option>
            ))}
          </select>
          {touched.category && errors.category && (
            <p className="mt-1 text-xs text-red-500">{errors.category}</p>
          )}
        </div>

        {/* ---------- 图片上传 ---------- */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            图片 <span className="text-gray-400 font-normal">（可选，最多3张）</span>
          </label>

          {/* 缩略图预览 */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {previews.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`预览 ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 上传区域 */}
          {images.length < MAX_IMAGES && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
              }`}
            >
              <svg
                className={`w-8 h-8 mb-1 ${dragOver ? 'text-blue-400' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className={`text-sm ${dragOver ? 'text-blue-500' : 'text-gray-500'}`}>
                {dragOver ? '松开上传' : '点击选择图片或拖拽上传'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">支持 JPG、PNG、WEBP</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addImages(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* ---------- 联系方式 ---------- */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            联系方式 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            onBlur={() => handleBlur('contact')}
            placeholder="手机号或微信号"
            className={inputClass('contact')}
          />
          {touched.contact && errors.contact && (
            <p className="mt-1 text-xs text-red-500">{errors.contact}</p>
          )}
        </div>

        {/* ---------- 操作按钮 ---------- */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${
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
              '发布商品'
            )}
          </button>
        </div>
      </div>
    </>
  )
}