'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, Search, KeySquare, PanelLeft } from 'lucide-react'

import {
  Button,
  Input,
  Badge,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  DropdownMenu,
  DropdownMenuItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { HasPermission } from '@/components/has-permission'
import { RoleDialog } from '@/components/admin/roles/role-dialog'
import { AssignPermissionsDialog } from '@/components/admin/roles/assign-permissions-dialog'
import { AssignMenusDialog } from '@/components/admin/roles/assign-menus-dialog'
import { isSuperAdminRole } from '@/components/admin/roles/role-utils'
import {
  listRoles,
  deleteRole as deleteRoleApi,
  type AdminRole,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'

const PAGE_SIZE = 10

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0) // 0-based
  const [loading, setLoading] = useState(true)

  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('') // 已应用的搜索词

  // 弹窗状态
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const [permTarget, setPermTarget] = useState<AdminRole | null>(null)
  const [permOpen, setPermOpen] = useState(false)
  const [menuTarget, setMenuTarget] = useState<AdminRole | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listRoles({
        page,
        size: PAGE_SIZE,
        keyword: keyword || undefined,
      })
      setRoles(res.items)
      setTotal(res.total)
    } catch (err) {
      toastApiError(err, '加载角色列表失败')
      setRoles([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const onSearch = () => {
    setPage(0)
    setKeyword(keywordInput.trim())
  }

  const openCreate = () => {
    setEditing(null)
    setRoleDialogOpen(true)
  }

  const openEdit = (role: AdminRole) => {
    setEditing(role)
    setRoleDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRoleApi(deleteTarget.id)
      toast.success('角色已删除')
      setDeleteOpen(false)
      // 删除后若当前页空了，回退一页
      if (roles.length === 1 && page > 0) {
        setPage(page - 1)
      } else {
        fetchRoles()
      }
    } catch (err) {
      toastApiError(err, '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">角色管理</h1>
        <p className="text-sm text-muted-foreground">定义角色，并为角色分配权限码与可见菜单</p>
      </div>

      {/* 工具栏：搜索 + 新增 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder="搜索名称/编码/描述"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch()
              }}
            />
          </div>
          <Button variant="outline" onClick={onSearch}>
            搜索
          </Button>
        </div>

        <HasPermission code="admin:role:write">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新增角色
          </Button>
        </HasPermission>
      </div>

      {/* 列表 */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>角色</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-20">权限</TableHead>
              <TableHead className="w-20">菜单</TableHead>
              <TableHead className="w-20">排序</TableHead>
              <TableHead className="w-16 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  加载中…
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const isSuper = isSuperAdminRole(role)
                return (
                  <TableRow key={role.id}>
                    {/* 角色 */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {role.name}
                        </span>
                        {isSuper && (
                          <Badge variant="warning" className="shrink-0">
                            内置
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{role.code}</span>
                    </TableCell>

                    {/* 描述 */}
                    <TableCell className="max-w-64">
                      <span className="block truncate text-xs text-muted-foreground">
                        {role.description || '—'}
                      </span>
                    </TableCell>

                    {/* 权限/菜单数（SUPER_ADMIN 由后端 bypass，无需显式分配） */}
                    <TableCell className="text-xs text-muted-foreground">
                      {isSuper ? '全部' : `${role.permissionCodes.length} 项`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {isSuper ? '全部' : `${role.menuIds.length} 项`}
                    </TableCell>

                    {/* 排序 */}
                    <TableCell className="text-xs text-muted-foreground">
                      {role.sortOrder ?? '—'}
                    </TableCell>

                    {/* 操作 */}
                    <TableCell className="text-right">
                      <HasPermission code="admin:role:write">
                        <DropdownMenu
                          align="end"
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        >
                          <DropdownMenuItem onClick={() => openEdit(role)}>
                            <Pencil className="size-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPermTarget(role)
                              setPermOpen(true)
                            }}
                          >
                            <KeySquare className="size-4" />
                            分配权限
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setMenuTarget(role)
                              setMenuOpen(true)
                            }}
                          >
                            <PanelLeft className="size-4" />
                            分配菜单
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            disabled={isSuper}
                            title={isSuper ? 'SUPER_ADMIN 为基石角色，不可删除' : undefined}
                            onClick={() => {
                              if (isSuper) return
                              setDeleteTarget(role)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </HasPermission>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <Pagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />

      {/* 新增/编辑 */}
      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        role={editing}
        onSuccess={fetchRoles}
      />

      {/* 分配权限 */}
      <AssignPermissionsDialog
        open={permOpen}
        onOpenChange={setPermOpen}
        role={permTarget}
        onSuccess={fetchRoles}
      />

      {/* 分配菜单 */}
      <AssignMenusDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        role={menuTarget}
        onSuccess={fetchRoles}
      />

      {/* 删除确认 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除角色</DialogTitle>
            <DialogDescription>
              确定删除角色「{deleteTarget?.name}」吗？已分配该角色的用户将失去其权限，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
