import type { CustomRoute, ElegantConstRoute, ElegantRoute, GeneratedRoute } from '@elegant-router/types';
import { generatedRoutes } from '../elegant/routes';
import { layouts, views } from '../elegant/imports';
import { transformElegantRoutesToVueRoutes } from '../elegant/transform';

/**
 * custom routes
 *
 * @link https://github.com/soybeanjs/elegant-router?tab=readme-ov-file#custom-route
 */
const customRoutes: CustomRoute[] = [];

/**
 * 提平「父级＝叶子页」的中间层（三段 route key 产物，#68）。
 *
 * 目录下划线命名（skill_assignment，price_entry 先例）生成三段 route key，elegant-router 按
 * 前缀把它嵌套为同名路由（aiplatform_skill）的 children——而 aiplatform_skill 自身是叶子页
 * （有 component）。生成器 transform（elegant/transform.ts）对带 children 的非一级路由会设
 * redirect→首子，静态回退模式下 /aiplatform/skill 会被劫持到 /aiplatform/skill/assignment、
 * 菜单也把技能管理变父项。此处消费侧提平（手写文件，gen-route 重跑不冲掉）：「有 component
 * 且有 children」的子节点保留叶子本体、其 children 提升为本层平级。纯父中间层（无 component，
 * 如 aiplatform_price）不在此列——redirect 是其预期形态。动态模式由 menus/my 树驱动（叶子
 * 直接挂目录），不经此层；成员对象原样引用，仅层级重排。
 */
function flattenLeafParentRoutes(routes: ElegantConstRoute[]): ElegantConstRoute[] {
  return routes.map(route => {
    if (!route.children?.length) return route;
    const flattened: ElegantConstRoute[] = [];
    for (const child of route.children) {
      if (child.component && child.children?.length) {
        flattened.push({ ...child, children: undefined });
        flattened.push(...child.children);
      } else {
        flattened.push(child);
      }
    }
    return { ...route, children: flattened };
  });
}

/** create routes when the auth route mode is static */
export function createStaticRoutes() {
  const constantRoutes: ElegantRoute[] = [];

  const authRoutes: ElegantRoute[] = [];

  [...customRoutes, ...(flattenLeafParentRoutes(generatedRoutes) as GeneratedRoute[])].forEach(item => {
    if (item.meta?.constant) {
      constantRoutes.push(item);
    } else {
      authRoutes.push(item);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

/**
 * Get auth vue routes
 *
 * @param routes Elegant routes
 */
export function getAuthVueRoutes(routes: ElegantConstRoute[]) {
  return transformElegantRoutesToVueRoutes(routes, layouts, views);
}
