'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@/components/ui'
import {
  createUser,
  updateUser,
  type AdminUser,
  type CreateAdminUserParams,
  type UpdateAdminUserParams,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'
import {
  USERNAME_REGEX,
  PASSWORD_REGEX,
  USERNAME_HINT,
  PASSWORD_HINT,
} from './validation'
import { Field } from './field'

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑时传入用户；新增时为 null/undefined。 */
  user?: AdminUser | null
  onSuccess?: () => void
}

interface FormState {
  username: string
  password: string
  nickname: string
  email: string
  phone: string
  avatar: string
}

const EMPTY: FormState = {
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  avatar: '',
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // 打开时按模式同步字段
  useEffect(() => {
    if (!open) return
    if (user) {
      setForm({
        username: user.username,
        password: '',
        nickname: user.nickname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        avatar: user.avatar ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, user])

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!isEdit) {
      if (!USERNAME_REGEX.test(form.username.trim())) e.username = USERNAME_HINT
      if (!PASSWORD_REGEX.test(form.password)) e.password = PASSWORD_HINT
    }
    if (!form.nickname.trim()) e.nickname = '昵称不能为空'
    else if (form.nickname.length > 50) e.nickname = '昵称长度不能超过 50'
    if (form.email && form.email.length > 255) e.email = '邮箱长度不能超过 255'
    if (form.phone && form.phone.length > 20) e.phone = '手机号长度不能超过 20'
    if (isEdit && form.avatar && form.avatar.length > 512)
      e.avatar = '头像 URL 长度不能超过 512'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEdit && user) {
        const params: UpdateAdminUserParams = {
          nickname: form.nickname.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          avatar: form.avatar.trim() || undefined,
        }
        await updateUser(user.id, params)
        toast.success('用户已更新')
      } else {
        const params: CreateAdminUserParams = {
          username: form.username.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }
        await createUser(params)
        toast.success('用户已创建')
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `修改 ${user?.username} 的资料`
              : '创建一个新的管理员账号'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="用户名"
            required={!isEdit}
            error={errors.username}
            hint={isEdit ? undefined : USERNAME_HINT}
          >
            <Input
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              disabled={isEdit}
              placeholder="字母开头，3-20 位"
            />
          </Field>

          {!isEdit && (
            <Field label="密码" required error={errors.password} hint={PASSWORD_HINT}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="8-20 位，含字母和数字"
              />
            </Field>
          )}

          <Field label="昵称" required error={errors.nickname}>
            <Input
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="显示名称"
            />
          </Field>

          <Field label="邮箱" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="可选"
            />
          </Field>

          <Field label="手机号" error={errors.phone}>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="可选"
            />
          </Field>

          {isEdit && (
            <Field label="头像 URL" error={errors.avatar}>
              <Input
                value={form.avatar}
                onChange={(e) => set('avatar', e.target.value)}
                placeholder="可选"
              />
            </Field>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
