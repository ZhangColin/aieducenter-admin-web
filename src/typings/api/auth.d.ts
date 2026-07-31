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
      /** 1=激活 0=禁用 */
      status: number;
      statusName: string;
      breakGlass: boolean;
      createdAt: string;
      updatedAt: string;
      /**
       * 该用户已分配角色。仅 `GET /users/{id}` 详情填充 `{id,name,code}`；
       * 列表 `GET /users` 与 `GET /auth/current` 因后端 `@JsonInclude(NON_NULL)` **不含**——
       * 「分配角色」回显须取详情。REQ-4。
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

    /** 后端 MenuResponse 节点（type: 1=GROUP 2=MENU 3=DIVIDER） */
    interface BackendMenu {
      id: string;
      name: string;
      path: string;
      icon: string;
      parentId: string;
      sortOrder: number;
      type: number;
      children?: BackendMenu[];
    }
  }
}
