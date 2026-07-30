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
  createRole,
  updateRole,
  type AdminRole,
  type RoleFormParams,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'
import {
  ROLE_NAME_MAX,
  ROLE_CODE_MAX,
  ROLE_DESCRIPTION_MAX,
  ROLE_NAME_HINT,
  ROLE_CODE_HINT,
} from './validation'
import { Field } from '@/components/admin/users/field'
import { isSuperAdminRole } from './role-utils'

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑时传入角色；新增时为 null/undefined。 */
  role?: AdminRole | null
  onSuccess?: () => void
}

interface FormState {
  name: string
  code: string
  description: string
  sortOrder: string
}

const EMPTY: FormState = { name: '', code: '', description: '', sortOrder: '' }

export function RoleDialog({ open, onOpenChange, role, onSuccess }: RoleDialogProps) {
  const isEdit = !!role
  // 基石角色保护：SUPER_ADMIN 的 code 不可改（业务保护，非权限判断；后端另有删除拦截兜底）
  const codeLocked = isEdit && isSuperAdminRole(role)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // 打开时按模式同步字段
  useEffect(() => {
    if (!open) return
    if (role) {
      setForm({
        name: role.name ?? '',
        code: role.code ?? '',
        description: role.description ?? '',
        sortOrder: role.sortOrder != null ? String(role.sortOrder) : '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, role])

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = '角色名称不能为空'
    else if (form.name.length > ROLE_NAME_MAX) e.name = ROLE_NAME_HINT
    if (!form.code.trim()) e.code = '角色编码不能为空'
    else if (form.code.length > ROLE_CODE_MAX) e.code = ROLE_CODE_HINT
    if (form.description.length > ROLE_DESCRIPTION_MAX)
      e.description = `描述长度不能超过 ${ROLE_DESCRIPTION_MAX}`
    if (form.sortOrder.trim()) {
      const n = Number(form.sortOrder)
      if (!Number.isInteger(n) || n < 0) e.sortOrder = '排序值须为非负整数'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const params: RoleFormParams = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : undefined,
    }
    try {
      if (isEdit && role) {
        await updateRole(role.id, params)
        toast.success('角色已更新')
      } else {
        await createRole(params)
        toast.success('角色已创建')
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
          <DialogTitle>{isEdit ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `修改角色 ${role?.name} 的定义` : '创建一个新的角色'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="角色名称" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="如：运营专员"
            />
          </Field>

          <Field
            label="角色编码"
            required
            error={errors.code}
            hint={codeLocked ? 'SUPER_ADMIN 为基石角色，编码不可修改' : ROLE_CODE_HINT}
          >
            <Input
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              disabled={codeLocked}
              placeholder="如：OPS_ADMIN"
            />
          </Field>

          <Field label="描述" error={errors.description}>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="可选"
            />
          </Field>

          <Field label="排序值" error={errors.sortOrder} hint="越小越靠前，可选">
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
              placeholder="可选"
            />
          </Field>

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
