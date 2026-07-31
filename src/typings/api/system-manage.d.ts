declare namespace Api {
  /**
   * namespace SystemManage
   *
   * backend api module: 系统管理（用户/角色/菜单）。对接 admin 后端 /api/admin。
   */
  namespace SystemManage {
    /**
     * 后端 AdminUserResponse（GET /users 列表项 / GET /users/{id}）。
     * 与 Api.Auth.AdminUser 同构（登录用户也用此结构）。
     *
     * 注：`status` 后端运行时为**整数**（1=激活 / 0=禁用），OpenAPI 标 string 实为误导——按整数对接。
     */
    type User = Api.Auth.AdminUser;

    /**
     * GET /users 搜索参数（后端 AdminUserQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     */
    interface UserSearchParams {
      username?: string | null;
      /** 1=激活 / 0=禁用；null/undefined = 不过滤 */
      status?: number | null;
      /** 用户名/昵称模糊匹配（后端 keyword） */
      keyword?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** POST /users（后端 CreateAdminUserCommand） */
    interface UserCreateCommand {
      username: string;
      password: string;
      nickname: string;
      email?: string | null;
      phone?: string | null;
    }

    /** PUT /users/{id}（后端 UpdateAdminUserCommand；username 不可改、status 经独立接口切换） */
    interface UserUpdateCommand {
      nickname?: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
    }

    /** PUT /users/{id}/password（后端 ResetPasswordCommand） */
    interface ResetPasswordCommand {
      newPassword: string;
    }
  }
}
