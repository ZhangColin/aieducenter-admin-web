'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, KeyRound, Trash2, Search } from 'lucide-react'

import {
  Button,
  Input,
  Select,
  Switch,
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
import { UserDialog } from '@/components/admin/users/user-dialog'
import { ResetPasswordDialog } from '@/components/admin/users/reset-password-dialog'
import { USER_STATUS_LABEL, statusLabel } from '@/components/admin/users/user-status'
import {
  listUsers,
  deleteUser as deleteUserApi,
  updateUserStatus,
  type AdminUser,
} from '@/lib/admin-api'
import { toastApiError } from '@/lib/api-error'

const PAGE_SIZE = 10
const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: USER_STATUS_LABEL[1], value: '1' },
  { label: USER_STATUS_LABEL[0], value: '0' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0) // 0-based
  const [loading, setLoading] = useState(true)

  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('') // 已应用的搜索词
  const [statusValue, setStatusValue] = useState('all')

  // 弹窗状态
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const status = statusValue === 'all' ? undefined : Number(statusValue)
      const res = await listUsers({
        page,
        size: PAGE_SIZE,
        keyword: keyword || undefined,
        status,
      })
      setUsers(res.items)
      setTotal(res.total)
    } catch (err) {
      toastApiError(err, '加载用户列表失败')
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusValue, keyword])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const onSearch = () => {
    setPage(0)
    setKeyword(keywordInput.trim())
  }

  const onStatusChange = (value: string) => {
    setStatusValue(value)
    setPage(0)
  }

  const openCreate = () => {
    setEditing(null)
    setUserDialogOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setUserDialogOpen(true)
  }

  const onToggleStatus = async (user: AdminUser) => {
    const next = user.status === 1 ? 0 : 1
    try {
      await updateUserStatus(user.id, next)
      toast.success(next === 1 ? '已启用' : '已禁用')
      fetchUsers()
    } catch (err) {
      toastApiError(err)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUserApi(deleteTarget.id)
      toast.success('用户已删除')
      setDeleteOpen(false)
      // 删除后若当前页空了，回退一页
      if (users.length === 1 && page > 0) {
        setPage(page - 1)
      } else {
        fetchUsers()
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">用户管理</h1>
        <p className="text-sm text-muted-foreground">管理后台运营账号、启停状态与密码</p>
      </div>

      {/* 工具栏：搜索 + 状态筛选 + 新增 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder="搜索用户名/昵称/邮箱"
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
          <Select
            className="w-32"
            value={statusValue}
            onValueChange={onStatusChange}
            options={STATUS_OPTIONS}
          />
        </div>

        <HasPermission code="admin:user:write">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新增用户
          </Button>
        </HasPermission>
      </div>

      {/* 列表 */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>联系方式</TableHead>
              <TableHead className="w-28">状态</TableHead>
              <TableHead className="w-44">创建时间</TableHead>
              <TableHead className="w-16 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  加载中…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  {/* 用户 */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.nickname}
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {(user.nickname || user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-slate-900 dark:text-white">
                            {user.nickname || user.username}
                          </span>
                          {user.breakGlass && (
                            <Badge variant="warning" className="shrink-0">
                              破窗
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 联系方式 */}
                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <div className="truncate">{user.email || '—'}</div>
                      <div>{user.phone || '—'}</div>
                    </div>
                  </TableCell>

                  {/* 状态 */}
                  <TableCell>
                    <HasPermission
                      code="admin:user:write"
                      fallback={<StatusBadge status={user.status} />}
                    >
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.status === 1}
                          onCheckedChange={() => onToggleStatus(user)}
                          disabled={user.breakGlass}
                          aria-label="启用/禁用"
                        />
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(user.status)}
                        </span>
                      </div>
                    </HasPermission>
                  </TableCell>

                  {/* 创建时间 */}
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(user.createdAt)}
                  </TableCell>

                  {/* 操作 */}
                  <TableCell className="text-right">
                    <HasPermission code="admin:user:write">
                      <DropdownMenu
                        align="end"
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Pencil className="size-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setResetTarget(user)
                            setResetOpen(true)
                          }}
                        >
                          <KeyRound className="size-4" />
                          重置密码
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          disabled={user.breakGlass}
                          title={
                            user.breakGlass ? '破窗账号不可删除' : undefined
                          }
                          onClick={() => {
                            if (user.breakGlass) return
                            setDeleteTarget(user)
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <Pagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />

      {/* 新增/编辑 */}
      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={editing}
        onSuccess={fetchUsers}
      />

      {/* 重置密码 */}
      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        user={resetTarget}
      />

      {/* 删除确认 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定删除用户「{deleteTarget?.nickname || deleteTarget?.username}」吗？此操作不可撤销。
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

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge variant={status === 1 ? 'success' : 'secondary'}>
      {statusLabel(status)}
    </Badge>
  )
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
