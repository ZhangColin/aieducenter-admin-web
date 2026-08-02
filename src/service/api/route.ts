import type { RouteKey } from '@elegant-router/types';
import { generatedRoutes } from '@/router/elegant/routes';
import { isRouteExistByRouteName } from '@/store/modules/route/shared';
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

/** get user routes */
export function fetchGetUserRoutes() {
  return request<Api.Route.UserRoute>({ url: '/route/getUserRoutes' });
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
