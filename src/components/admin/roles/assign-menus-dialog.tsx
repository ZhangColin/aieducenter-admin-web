'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { listMenus, assignRoleMenus, type AdminRole, type MenuResponse } from '@/lib/admin-api'
import { MENU_TYPE } from '@/lib/admin-auth-store'
import { toastApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { isSuperAdminRole } from './role-utils'
import {
  collectAllIds,
  filterDividers,
  nodeCheckState,
  toggleNode,
} from './menu-tree'

interface AssignMenusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: AdminRole | null
  onSuccess?: () => void
}

/**
 * 给角色分配菜单：树形勾选，回显角色当前 menuIds。
 * - DIVIDER（type=3）不出现在勾选树——决策 B：不分配、由后端按结构自动纳入；
 * - 父节点勾选级联全部后代；只勾叶子时祖先 GROUP 链由后端读取时补全（REQ-1 契约），
 *   故提交 = 勾选项原样（不含半选父节点）；
 * - 后端 AssignMenusCommand @NotEmpty —— 至少保留一项。
 */
export function AssignMenusDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: AssignMenusDialogProps) {
  const [tree, setTree] = useState<MenuResponse[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const readOnly = isSuperAdminRole(role)

  // 树中真实存在的 id：过滤数据漂移产生的幽灵 id，并据其准确判断可提交数量
  // （后端 AssignMenusCommand @NotEmpty——提交前须确保至少一项）
  const visibleIds = useMemo(() => new Set(collectAllIds(tree)), [tree])
  const submittableCount = useMemo(
    () => [...checked].filter((id) => visibleIds.has(id)).length,
    [checked, visibleIds]
  )

  // 打开时加载菜单树（过滤 DIVIDER）+ 回显当前已分配
  useEffect(() => {
    if (!open || !role) return
    setChecked(new Set(role.menuIds))
    setLoading(true)
    listMenus()
      .then((menus) => setTree(filterDividers(menus)))
      .catch((err) => toastApiError(err, '加载菜单树失败'))
      .finally(() => setLoading(false))
  }, [open, role])

  const onToggle = (node: MenuResponse, target: boolean) => {
    setChecked((prev) => toggleNode(node, prev, target))
  }

  const handleSubmit = async () => {
    if (!role) return
    setSubmitting(true)
    try {
      // 只提交树中真实存在的节点（丢弃数据漂移产生的幽灵 id）
      const menuIds = [...checked].filter((id) => visibleIds.has(id))
      await assignRoleMenus(role.id, menuIds)
      toast.success('菜单已分配')
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
          <DialogTitle>分配菜单</DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'SUPER_ADMIN 由后端自动放行全部菜单，无需配置'
              : `为角色「${role?.name}」勾选可见菜单（至少保留一项）`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto py-1">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>
          ) : tree.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无可分配菜单</p>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <MenuTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  checked={checked}
                  readOnly={readOnly}
                  onToggle={onToggle}
                />
              ))}
            </div>
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
            disabled={submitting || loading || readOnly || submittableCount === 0}
            title={submittableCount === 0 ? '至少保留一个菜单' : undefined}
          >
            {submitting ? '提交中…' : `保存（已选 ${submittableCount}）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MenuTreeNodeProps {
  node: MenuResponse
  depth: number
  checked: ReadonlySet<string>
  readOnly: boolean
  onToggle: (node: MenuResponse, target: boolean) => void
}

function MenuTreeNode({ node, depth, checked, readOnly, onToggle }: MenuTreeNodeProps) {
  const state = nodeCheckState(node, checked)
  const isGroup = node.type === MENU_TYPE.GROUP
  return (
    <div>
      <label
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800',
          depth > 0 && 'ml-6'
        )}
      >
        <Checkbox
          checked={state.checked}
          indeterminate={state.indeterminate}
          onCheckedChange={(target) => onToggle(node, target)}
          disabled={readOnly}
          aria-label={node.name}
        />
        <span
          className={cn(
            'truncate text-sm',
            isGroup
              ? 'font-semibold text-slate-900 dark:text-white'
              : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {node.name}
        </span>
        {isGroup && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-slate-800">
            分组
          </span>
        )}
      </label>
      {node.children?.map((child) => (
        <MenuTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          checked={checked}
          readOnly={readOnly}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
