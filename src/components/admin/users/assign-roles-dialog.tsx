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
  Checkbox,
} from '@/components/ui'
import {
  listRoles,
  getUser,
  assignUserRoles,
  type AdminUser,
  type AdminRole,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'

interface AssignRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | null
  onSuccess?: () => void
}

/**
 * 给用户分配角色：全量角色勾选 + 回显该用户当前已分配角色。
 * 列表项不含 roles（后端仅 GET /users/{id} 详情返回），故打开时另行 getUser(id) 取回显。
 * 后端 AssignRolesCommand @NotEmpty —— 至少保留一项。
 */
export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: AssignRolesDialogProps) {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 打开时加载全量角色 + 回显当前已分配（详情接口才带 roles）
  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    setChecked(new Set())
    Promise.all([
      listRoles({ page: 0, size: ROLE_FETCH_SIZE }),
      getUser(user.id),
    ])
      .then(([res, detail]) => {
        if (res.items.length < res.total) {
          // 角色超过单页上限（内部后台不应出现）：留痕，避免静默截断难排查
          console.warn(`角色未全量加载：${res.items.length}/${res.total}`)
        }
        setRoles(res.items)
        setChecked(new Set((detail.roles ?? []).map((r) => r.id)))
      })
      .catch((err) => toastApiError(err, '加载角色失败'))
      .finally(() => setLoading(false))
  }, [open, user])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await assignUserRoles(user.id, [...checked])
      toast.success('角色已分配')
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
          <DialogTitle>分配角色</DialogTitle>
          <DialogDescription>
            为用户「{user?.nickname || user?.username}」勾选角色（至少保留一项）
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-1 overflow-y-auto py-1">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>
          ) : roles.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              暂无可分配的角色
            </p>
          ) : (
            roles.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Checkbox
                  checked={checked.has(role.id)}
                  onCheckedChange={() => toggle(role.id)}
                  aria-label={role.name}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-900 dark:text-white">
                    {role.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {role.code}
                    {role.description ? ` · ${role.description}` : ''}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || checked.size === 0}
            title={checked.size === 0 ? '至少保留一项角色' : undefined}
          >
            {submitting ? '提交中…' : `保存（已选 ${checked.size}）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 内部工具：角色为有限集合，取较大分页一次性拉全（避免列表截断）。 */
const ROLE_FETCH_SIZE = 200
