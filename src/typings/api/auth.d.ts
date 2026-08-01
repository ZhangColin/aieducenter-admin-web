declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth" (admin 后端 /api/admin/auth)
   */
  namespace Auth {
    /** POST /auth/login 的 data（后端 TokenInfo；Sa-Token 无 refreshToken） */
    interface LoginToken {
      token: string;
      /** loginId 为后端 Long，序列化为字符串，避免精度丢失 */
      loginId: string;
      expireTime: string;
    }

    /**
     * 前端 auth store 持有的用户信息（由 CurrentUser 映射而来）。
     * - userId   ← user.id（String，防 Long 精度丢失）
     * - userName ← user.nickname（header 展示用）
     * - roles    ← roleCodes（路由/按钮鉴权）
     * - buttons  ← permissions（按钮级权限码）
     */
    interface UserInfo {
      userId: string;
      userName: string;
      roles: string[];
      buttons: string[];
    }

    /** 后端 AdminUserResponse（GET /auth/current 内的 user 字段） */
    interface AdminUser {
      id: string;
      username: string;
      nickname: string;
      email: string | null;
      phone: string | null;
      avatar: string | null;
      /** 性别整数：1=男 / 2=女；null=未填写（0 非法）。REQ-11 */
      gender?: number | null;
      /** 性别中文名（后端序列化）；null=未填写。REQ-11。前端列渲染用 `userGenderRecord`（同 `statusName` 范式，此字段仅契约对齐） */
      genderName?: string | null;
      /** 1=激活 0=禁用 */
      status: number;
      statusName: string;
      breakGlass: boolean;
      createdAt: string;
      updatedAt: string;
      /**
       * 该用户已分配角色 `{id,name,code}`。REQ-4 + REQ-11：
       * - `GET /users/{id}` 详情 与 `GET /users` **列表** 均填充（REQ-11 起，列表「角色」列直接读此）；
       * - `GET /auth/current` **不含**（后端 `@JsonInclude(NON_NULL)`，/auth/current 不回填 roles）。
       */
      roles?: Api.SystemManage.UserRole[] | null;
    }

    /** GET /auth/current 的响应（后端 CurrentUserResponse） */
    interface CurrentUser {
      user: AdminUser;
      roleCodes: string[];
      permissions: string[];
      /** static 路由模式暂不消费；动态菜单 ticket（#11）再用 */
      menus: BackendMenu[];
    }

    /**
     * 后端 MenuResponse 节点（Soybean「路由生成器」模型，REQ-8 / 后端 #13）。
     *
     * - `menuType`: 1=directory 2=menu（旧 nav-tree 方案的 DIVIDER(3) 已废弃，无第 3 值）。
     * - `iconType`: 1=iconify / 2=local svg（REQ-8 切 iconify+iconType，废弃 REQ-6 Material Symbols）。
     * - 字段名随 Soybean 对齐：旧 `name/path/type` → `menuName/routePath/menuType`，
     *   并补 routeName/component/i18nKey 等路由元数据。
     */
    interface BackendMenu {
      id: string;
      menuName: string;
      routeName: string;
      routePath: string;
      component: string | null;
      icon: string | null;
      iconType: number;
      parentId: string | null;
      sortOrder: number;
      menuType: number;
      i18nKey?: string | null;
      keepAlive?: boolean;
      constant?: boolean;
      multiTab?: boolean;
      hideInMenu?: boolean;
      activeMenu?: string | null;
      href?: string | null;
      fixedIndexInTab?: number | null;
      query?: Array<{ key: string; value: string }>;
      status?: number;
      children?: BackendMenu[];
    }
  }
}
