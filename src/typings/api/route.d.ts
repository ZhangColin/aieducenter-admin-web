declare namespace Api {
  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }

    /**
     * GET /menus/my 的响应（REQ-13「我的导航」，登录即可访问）。
     *
     * 与 Soybean `UserRoute` 形状对应，`fetchGetUserRoutes` 直通映射：
     * `menus` 经转换器（route store shared 模块）→ `routes`，`home` 经兜底 helper 校验。
     */
    interface MyNavigation {
      /**
       * 默认首页 routeName：sortOrder 最小角色的非空 `home`；所有角色均未配 → `null`。
       * 为 null 或指向本地未知路由时，前端兜底第一个可见叶子菜单（spec #20 决策 5）。
       */
      home: string | null;
      /** 按当前用户角色裁剪的可见菜单树（只含启用菜单；directory 禁用则整棵子树不下发——服务端职责） */
      menus: Api.Auth.BackendMenu[];
    }
  }
}
