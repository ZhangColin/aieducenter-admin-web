import { MENU_TYPE, type MenuResponse } from '@/lib/admin-auth-store'

/**
 * 分配菜单树的纯逻辑 helper（与组件分离，便于推理/复用）。
 * 契约依据（REQ-1 + 决策 B）：DIVIDER 不分配给角色、按结构自动纳入 → 勾选树不含 DIVIDER。
 */

/** 递归过滤 DIVIDER 节点（返回新树，不改原数组）。 */
export function filterDividers(nodes: MenuResponse[]): MenuResponse[] {
  return nodes
    .filter((n) => n.type !== MENU_TYPE.DIVIDER)
    .map((n) => ({ ...n, children: filterDividers(n.children ?? []) }))
}

/** 收集节点的全部后代 id（不含自身）。 */
export function collectDescendantIds(node: MenuResponse): string[] {
  const out: string[] = []
  const walk = (n: MenuResponse) => {
    for (const c of n.children ?? []) {
      out.push(c.id)
      walk(c)
    }
  }
  walk(node)
  return out
}

/** 收集整棵树的全部节点 id。 */
export function collectAllIds(nodes: MenuResponse[]): string[] {
  const out: string[] = []
  const walk = (list: MenuResponse[]) => {
    for (const n of list) {
      out.push(n.id)
      walk(n.children ?? [])
    }
  }
  walk(nodes)
  return out
}

export interface NodeCheckState {
  checked: boolean
  indeterminate: boolean
}

/**
 * 计算节点的勾选展示态：
 * - 叶子：自身在集合中 → checked；
 * - 容器：全部后代被勾 → checked，部分后代被勾 → indeterminate。
 *
 * 容器态纯粹由后代推导（不看自身 id 是否在集合中）——否则祖先 id 一旦因「勾选父节点」
 * 入集，即使随后取消某个子节点，祖先仍会显示全选，回显失真。
 */
export function nodeCheckState(node: MenuResponse, checked: ReadonlySet<string>): NodeCheckState {
  const desc = collectDescendantIds(node)
  if (desc.length === 0) {
    return { checked: checked.has(node.id), indeterminate: false }
  }
  const all = desc.every((id) => checked.has(id))
  const some = desc.some((id) => checked.has(id))
  return { checked: all, indeterminate: !all && some }
}

/**
 * 切换节点勾选：目标态作用于自身 + 全部后代（级联）。
 * 返回新的 checked 集合。
 */
export function toggleNode(
  node: MenuResponse,
  checked: ReadonlySet<string>,
  target: boolean
): Set<string> {
  const next = new Set(checked)
  const ids = [node.id, ...collectDescendantIds(node)]
  for (const id of ids) {
    if (target) next.add(id)
    else next.delete(id)
  }
  return next
}
