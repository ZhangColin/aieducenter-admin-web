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
     * 用户角色精简引用（后端 AdminUserResponse.roles 项）。
     * REQ-4 + REQ-11：`GET /users/{id}` 详情 与 `GET /users` 列表均填充；
     * `/auth/current` 不含（后端 @JsonInclude(NON_NULL)）。
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
      /** 手机号模糊匹配（后端 phone）；null/undefined = 不过滤。REQ-11 */
      phone?: string | null;
      /** 1=男 / 2=女；null/undefined = 不过滤。REQ-11 */
      gender?: number | null;
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
      /** 1=男 / 2=女 / null=未填写。REQ-11 */
      gender?: number | null;
    }

    /** PUT /users/{id}（后端 UpdateAdminUserCommand；username 不可改、status 经独立接口切换） */
    interface UserUpdateCommand {
      nickname?: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
      /** 1=男 / 2=女 / null=未填写。REQ-11 */
      gender?: number | null;
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
     * - `status` 整数（1=启用 / 0=禁用，同用户）；SUPER_ADMIN 角色后端不可禁（守卫在 `AdminRole.disable()`）
     * - `home` 默认首页 route name（可空，经 `PUT /roles/{id}` UpdateRoleCommand 提交，**非**分配菜单端点）。REQ-10
     */
    interface Role {
      id: string;
      name: string;
      code: string;
      description: string | null;
      sortOrder: number;
      /** 1=启用 / 0=禁用（同用户）。REQ-10 */
      status: number;
      /** 默认首页 route name（可空）。REQ-10 */
      home: string | null;
      menuIds: string[];
      permissionCodes: string[];
    }

    /**
     * 后端 RoleOptionResponse（GET /roles/all，REQ-10 / 后端 #16）。
     * 轻量角色字典项：仅启用、不分页、精简 `{id,name,code}`，供「分配角色」下拉选项源。
     */
    interface RoleOption {
      id: string;
      name: string;
      code: string;
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
      /** 1=启用 / 0=禁用；null/undefined = 不过滤。REQ-10（后端 AdminRoleQuery.status） */
      status?: number | null;
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
      /** 默认首页 route name（可空）。REQ-10 */
      home?: string | null;
    }

    /** PUT /roles/{id}（后端 UpdateRoleCommand；与 Create 同构） */
    interface RoleUpdateCommand {
      name: string;
      code: string;
      description?: string | null;
      sortOrder?: number | null;
      /** 默认首页 route name（可空）。REQ-10 —— 分配菜单弹窗经此端点改 home */
      home?: string | null;
    }

    /** PUT /roles/{id}/menus（后端 AssignMenusCommand；全量替换，空集=清空——REQ-10 已去 @NotEmpty） */
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

    /**
     * 菜单管理（admin 后端 /api/admin/menus）
     *
     * Soybean「路由生成器」模型（REQ-8 / 后端 #13）。与 Api.Auth.BackendMenu 同构，
     * 管理端 MenuResponse 另带 createdAt/updatedAt。
     *
     * - `id`/`parentId` Long→字符串；**root = parentId null**（非 0 / "0"）。
     * - `menuType`/`iconType`/`status` 经 BaseEnumSerializer **整数** 出/入站（非字符串）。
     * - 排序字段叫 `sortOrder`（后端避 PG 保留字；Soybean 叫 `order`，前端表单字段同名对齐后端）。
     * - `query` 恒非 null（空 = `[]`）；`children` 仅 `/menus/tree` 端点填充。
     */

    /** 菜单类型：1=directory（目录）/ 2=menu（菜单）。旧 DIVIDER(3) 已废弃。 */
    type MenuType = 1 | 2;

    /** 菜单图标类型：1=iconify / 2=local（本地图标）。 */
    type MenuIconType = 1 | 2;

    /** 后端 MenuQueryParam record（菜单路由 query 参数项） */
    interface MenuQueryParam {
      key: string;
      value: string;
    }

    /**
     * 后端 MenuResponse（GET /menus 列表项 / GET /menus/{id} / GET /menus/tree 节点）。
     * `status` 整数 1=启用 / 0=禁用（同用户/角色）。
     */
    interface Menu {
      id: string;
      menuName: string;
      routeName: string;
      routePath: string | null;
      component: string | null;
      icon: string | null;
      iconType: MenuIconType;
      parentId: string | null;
      sortOrder: number | null;
      menuType: MenuType;
      i18nKey: string | null;
      keepAlive: boolean;
      constant: boolean;
      multiTab: boolean;
      hideInMenu: boolean;
      activeMenu: string | null;
      href: string | null;
      fixedIndexInTab: number | null;
      query: MenuQueryParam[];
      /** 1=启用 / 0=禁用 */
      status: number;
      /** 仅 /menus/tree 填充 */
      children?: Menu[];
      createdAt: string;
      updatedAt: string;
    }

    /**
     * GET /menus 搜索参数（后端 MenuQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     */
    interface MenuSearchParams {
      /** 菜单名称模糊（后端 menuName INNER_LIKE） */
      menuName?: string | null;
      /** 1=directory / 2=menu；null/undefined = 不过滤 */
      menuType?: MenuType | null;
      /** 1=启用 / 0=禁用；null/undefined = 不过滤 */
      status?: number | null;
      /** menuName/routeName/routePath 多列模糊（后端 keyword blurry） */
      keyword?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /**
     * POST /menus 与 PUT /menus/{id} 请求体（Create/Update 同构；后端全量替换）。
     *
     * 后端仅校验 `menuName`/`routeName`/`menuType` 非空；**无 path 不变量**
     * （routePath 必填/禁填规则由前端表单兜底：menu 类型必填、directory 类型禁填）。
     */
    interface MenuCommand {
      menuName: string;
      routeName: string;
      /** menu 类型必填、directory 类型应为 null（前端兜底，后端透传） */
      routePath?: string | null;
      component?: string | null;
      icon?: string | null;
      iconType?: MenuIconType;
      /** null = root（顶级） */
      parentId?: string | null;
      sortOrder?: number | null;
      menuType: MenuType;
      i18nKey?: string | null;
      keepAlive: boolean;
      constant: boolean;
      multiTab: boolean;
      hideInMenu: boolean;
      activeMenu?: string | null;
      href?: string | null;
      fixedIndexInTab?: number | null;
      query?: MenuQueryParam[];
      /** 1=启用 / 0=禁用 */
      status?: number;
    }

    /**
     * 应用管理（admin 后端 /api/admin/apps）
     *
     * 分页约定同用户/角色：请求 `page` **0-based**、响应 PageResponse{ items, total, page(1-based), size }。
     * status 整数 1=启用 / 0=禁用。
     */

    /** GET /apps 搜索参数 */
    interface AppSearchParams {
      /** name + appCode 模糊（后端 keyword） */
      keyword?: string | null;
      /** 1=启用 / 0=禁用；null/undefined = 不过滤 */
      status?: number | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** 后端 AppSummaryResponse（GET /apps 列表项） */
    interface AppSummary {
      id: string;
      appCode: string;
      name: string;
      description: string | null;
      /** 0=禁用, 1=启用 */
      status: number;
      statusName: string;
      createdAt: string;
      updatedAt: string;
    }

    /** 后端 AppApiKeyResponse（详情中 apiKey 子对象） */
    interface AppApiKey {
      apiKey: string;
      status: number;
      statusName: string;
    }

    /** 后端 AppSsoClientResponse（详情中 ssoClient 子对象；null=未配置） */
    interface AppSsoClient {
      clientId: string;
      redirectUris: string[];
      scopes: string[];
      grants: string[];
      status: number;
      statusName: string;
    }

    /** GET /apps/{id} 详情聚合——后端返回扁平 AppSummary + 可选 apiKey + 可选 ssoClient */
    interface AppDetail extends AppSummary {
      /** null/不返回 = 未生成 ApiKey（新建应用初始态） */
      apiKey?: AppApiKey | null;
      /** null = 未配置 SSO；不返回 = 未配置 */
      ssoClient?: AppSsoClient | null;
    }

    /** POST /apps 创建命令 */
    interface AppCreateCommand {
      /** 4-64位小写字母数字连字符 */
      appCode: string;
      /** 最长128 */
      name: string;
      /** 最长512 */
      description?: string | null;
    }

    /** PUT /apps/{id} 更新命令 */
    interface AppUpdateCommand {
      name: string;
      description?: string | null;
    }

    /** POST /apps/{id}/api-key 响应——apiSecret 仅返回一次 */
    interface ApiKeyResponse {
      apiSecret: string;
    }

    /** POST /apps/{id}/sso-client 请求体 */
    interface SsoClientCommand {
      redirectUris: string[];
      scopes: string[];
      grants: string[];
    }

    /** POST /apps/{id}/sso-client 响应——clientSecret 仅返回一次 */
    interface SsoClientResponse {
      clientSecret: string;
    }
  }
}
