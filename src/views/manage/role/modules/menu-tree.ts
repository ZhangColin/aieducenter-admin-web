/**
 * 角色分配菜单的勾选树处理。
 *
 * 决策 B（CONTEXT line 149 / REQ-1）：DIVIDER（type=3）节点**不可分配给角色**——
 * 后端按邻居可见性自动纳入。故分配勾选树须过滤 DIVIDER。其余节点（GROUP/MENU，
 * 无论是否带子）一律保留可勾选——后端 `type` 与树深度正交（叶子也可能是 GROUP，
 * 见种子：用户管理/角色管理/菜单管理均 type=GROUP 且无子），不能按"GROUP 无子"裁剪，
 * 否则会误删可分配叶子。DIVIDER 结构性裁剪由后端在 sidebar 渲染侧负责，分配侧只剔 DIVIDER。
 */

/** 后端 MenuType code：1=GROUP 2=MENU 3=DIVIDER */
const MENU_TYPE_DIVIDER = 3;

/**
 * 过滤可分配菜单树：仅剔 DIVIDER（含嵌套），返回新树（不改入参）。
 */
export function filterAssignableMenuTree(menus: Api.Auth.BackendMenu[]): Api.Auth.BackendMenu[] {
  const result: Api.Auth.BackendMenu[] = [];

  for (const menu of menus) {
    if (menu.type === MENU_TYPE_DIVIDER) continue;

    const filtered: Api.Auth.BackendMenu = { ...menu };
    if (menu.children?.length) {
      filtered.children = filterAssignableMenuTree(menu.children);
    }

    result.push(filtered);
  }

  return result;
}
