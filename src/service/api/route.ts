import type { LastLevelRouteKey, RouteKey } from '@elegant-router/types';
import { generatedRoutes } from '@/router/elegant/routes';
import {
  getHomeRouteKeyByBackendMenus,
  isRouteExistByRouteName,
  transformBackendMenuToMenuRoutes
} from '@/store/modules/route/shared';
import { request } from '../request';

/**
 * get constant routes
 *
 * 本地化（#21 / spec #20 决策 3）：constant routes（login/403/404/500/iframe-page 等）是前端内建页，
 * 后端没有也不该有该端点——直接返回本地生成路由表中 `meta.constant` 的部分，不发请求
 * （避免 dynamic 模式每次启动 404 + 错误 toast）。
 * `id` 仅为 `MenuRoute` 形状要求，本地路由以 name 填充（运行时无消费者）。
 */
export async function fetchGetConstantRoutes(): Promise<{ data: Api.Route.MenuRoute[]; error: null }> {
  const constantRoutes: Api.Route.MenuRoute[] = generatedRoutes
    .filter(route => route.meta?.constant)
    .map(route => ({ ...route, id: route.name }));

  return { data: constantRoutes, error: null };
}

/**
 * get user routes
 *
 * 动态路由闭环（#22 / spec #20 决策 3）：打 REQ-13「我的导航」端点 `GET /menus/my`，
 * 响应 `{home, menus}` 直通映射为 Soybean `UserRoute` 的 `{routes, home}`——
 * `menus`（已按角色裁剪、只含启用）经转换器 → `MenuRoute` 树；`home` 经兜底链校验，
 * 兜底链仍为空（用户零菜单的退化场景）→ 回落 `VITE_ROUTE_HOME`，路由未注册自然落
 * not-found（spec 决策 5：不特殊处理）。route store / 守卫保持 upstream 逐字。
 */
export async function fetchGetUserRoutes() {
  const { data, error, response } = await request<Api.Route.MyNavigation>({ url: '/menus/my' });

  if (error) {
    return { data: null, error, response };
  }

  const routes = transformBackendMenuToMenuRoutes(data.menus);

  const home = (getHomeRouteKeyByBackendMenus(data.home, data.menus) ??
    import.meta.env.VITE_ROUTE_HOME) as LastLevelRouteKey;

  return { data: { routes, home }, error: null, response };
}

/**
 * whether the route is exist
 *
 * 本地化（#21 / spec #20 决策 3）：查本地完整生成路由表——路由名存在（但用户未被授予）→ true，
 * 路由守卫据此导 403；不存在 → false，落 404。不发请求。
 *
 * @param routeName route name
 */
export async function fetchIsRouteExist(routeName: string): Promise<{ data: boolean; error: null }> {
  return { data: isRouteExistByRouteName(routeName as RouteKey, generatedRoutes), error: null };
}
