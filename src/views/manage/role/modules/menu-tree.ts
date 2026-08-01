/**
 * 角色分配菜单的勾选树处理。
 *
 * Soybean 路由生成器模型（REQ-8 / 后端 #13）下，菜单只有 directory(1)/menu(2) 两类，
 * 均**可分配给角色**——旧 nav-tree 方案的 DIVIDER(type=3) 已废弃，无需再过滤。
 *
 * 本函数仅做深拷贝隔离（防渲染层误改响应数据），并为未来「不可分配类型」预留挂载点。
 */

/**
 * 深拷贝可分配菜单树（当前无类型需过滤，原样克隆）。
 */
export function filterAssignableMenuTree(menus: Api.Auth.BackendMenu[]): Api.Auth.BackendMenu[] {
  return menus.map(menu => ({
    ...menu,
    ...(menu.children?.length ? { children: filterAssignableMenuTree(menu.children) } : {})
  }));
}
