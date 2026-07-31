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
     * 用户详情 `GET /users/{id}` 回显的精简角色引用（后端 AdminUserResponse.roles）。
     * 列表/`/auth/current` 不含（@JsonInclude(NON_NULL)），仅详情填充。
     */
    interface UserRole {
      id: string;
      name: string;
      code: string;
    }

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

    /** PUT /users/{id}/roles（后端 AssignRolesCommand；roleIds @NotEmpty，不能存空） */
    interface AssignUserRolesCommand {
      roleIds: string[];
    }

    /**
     * 后端 RoleResponse（GET /roles 列表项 / GET /roles/{id}）。
     *
     * - `id` Long→字符串；`menuIds` 为后端 Set<Long>→字符串数组
     * - `menuIds` / `permissionCodes` = 该角色**当前**已分配集合，分配弹窗直接用它回显，无需 GET /roles/{id}
     * - 角色无 status 字段（区别于用户）
     */
    interface Role {
      id: string;
      name: string;
      code: string;
      description: string | null;
      sortOrder: number;
      menuIds: string[];
      permissionCodes: string[];
    }

    /**
     * GET /roles 搜索参数（后端 AdminRoleQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     */
    interface RoleSearchParams {
      /** 角色名称模糊（后端 name INNER_LIKE） */
      name?: string | null;
      /** 角色编码模糊（后端 code INNER_LIKE） */
      code?: string | null;
      /** 名称/编码/描述模糊（后端 keyword blurry） */
      keyword?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** POST /roles（后端 CreateRoleCommand） */
    interface RoleCreateCommand {
      name: string;
      code: string;
      description?: string | null;
      sortOrder?: number | null;
    }

    /** PUT /roles/{id}（后端 UpdateRoleCommand；与 Create 同构） */
    interface RoleUpdateCommand {
      name: string;
      code: string;
      description?: string | null;
      sortOrder?: number | null;
    }

    /** PUT /roles/{id}/menus（后端 AssignMenusCommand；menuIds @NotEmpty，不能存空） */
    interface AssignMenusCommand {
      menuIds: string[];
    }

    /** PUT /roles/{id}/permissions（后端 AssignPermissionsCommand；permissionCodes @NotEmpty，不能存空） */
    interface AssignPermissionsCommand {
      permissionCodes: string[];
    }

    /** 后端 PermissionResponse（GET /permissions；扁平 { code, name }） */
    interface Permission {
      code: string;
      name: string;
    }
  }
}
