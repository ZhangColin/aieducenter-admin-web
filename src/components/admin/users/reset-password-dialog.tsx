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
import { resetUserPassword, type AdminUser } from '@/lib/admin-api'
import { errorMessage } from '@/lib/api-error'
import { PASSWORD_REGEX, PASSWORD_HINT } from './validation'
import { Field } from './field'

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | null
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setNewPassword('')
      setConfirm('')
      setError(null)
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!PASSWORD_REGEX.test(newPassword)) {
      setError(PASSWORD_HINT)
      return
    }
    if (newPassword !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (!user) return
    setSubmitting(true)
    try {
      await resetUserPassword(user.id, { newPassword })
      toast.success(`已重置 ${user.username} 的密码`)
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>
            为用户 <span className="font-medium text-foreground">{user?.username}</span> 设置新密码
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="新密码" required hint={PASSWORD_HINT}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError(null)
              }}
              placeholder="8-20 位，含字母和数字"
            />
          </Field>
          <Field label="确认新密码" required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                setError(null)
              }}
              placeholder="再次输入新密码"
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
              {submitting ? '提交中…' : '重置密码'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
