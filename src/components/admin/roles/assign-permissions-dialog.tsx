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
  listPermissions,
  assignRolePermissions,
  type AdminRole,
  type PermissionItem,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'
import { isSuperAdminRole } from './role-utils'

interface AssignPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: AdminRole | null
  onSuccess?: () => void
}

/**
 * 给角色分配权限：全量权限码按「平台管理 / X / Y」的 X 段分组展示，
 * 回显角色当前 permissionCodes。后端 AssignPermissionsCommand @NotEmpty —— 至少保留一项。
 * SUPER_ADMIN 靠后端 bypass 放行、无需配置（description 自述），此处禁用提交避免误清空。
 */
export function AssignPermissionsDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: AssignPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const readOnly = isSuperAdminRole(role)

  // 打开时加载全量权限 + 回显当前已分配
  useEffect(() => {
    if (!open || !role) return
    setChecked(new Set(role.permissionCodes))
    setLoading(true)
    listPermissions()
      .then(setPermissions)
      .catch((err) => toastApiError(err, '加载权限列表失败'))
      .finally(() => setLoading(false))
  }, [open, role])

  const toggle = (code: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!role) return
    setSubmitting(true)
    try {
      await assignRolePermissions(role.id, [...checked])
      toast.success('权限已分配')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const groups = groupPermissions(permissions)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分配权限</DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'SUPER_ADMIN 由后端自动放行全部权限，无需配置'
              : `为角色「${role?.name}」勾选权限码（至少保留一项）`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-4 overflow-y-auto py-1">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>
          ) : groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无权限码</p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-2">
                  {items.map((p) => (
                    <label
                      key={p.code}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Checkbox
                        checked={checked.has(p.code)}
                        onCheckedChange={() => toggle(p.code)}
                        disabled={readOnly}
                        aria-label={p.name}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-900 dark:text-white">
                          {leafName(p.name)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.code}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
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
            disabled={submitting || loading || readOnly || checked.size === 0}
            title={checked.size === 0 ? '至少保留一项权限' : undefined}
          >
            {submitting ? '提交中…' : `保存（已选 ${checked.size}）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 权限名形如「平台管理 / 用户管理 / 查看」，按中段分组；无中段归入「其他」。 */
function groupPermissions(items: PermissionItem[]): [string, PermissionItem[]][] {
  const map = new Map<string, PermissionItem[]>()
  for (const p of items) {
    const seg = p.name.split(' / ')
    const group = seg.length >= 3 ? seg[1] : '其他'
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(p)
  }
  return [...map.entries()]
}

/** 取权限名末段（「查看」/「编辑」）；无层级则返回原名。 */
function leafName(name: string): string {
  const seg = name.split(' / ')
  return seg.length >= 2 ? seg[seg.length - 1] : name
}
