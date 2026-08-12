const local: App.I18n.Schema = {
  system: {
    title: '管理系统',
    updateTitle: '系统版本更新通知',
    updateContent: '检测到系统有新版本发布，是否立即刷新页面？',
    updateConfirm: '立即刷新',
    updateCancel: '稍后再说'
  },
  common: {
    action: '操作',
    add: '新增',
    addSuccess: '添加成功',
    back: '返回',
    backToHome: '返回首页',
    batchDelete: '批量删除',
    cancel: '取消',
    close: '关闭',
    check: '勾选',
    selectAll: '全选',
    expandColumn: '展开列',
    columnSetting: '列设置',
    config: '配置',
    confirm: '确认',
    delete: '删除',
    deleteSuccess: '删除成功',
    confirmDelete: '确认删除吗？',
    edit: '编辑',
    warning: '警告',
    error: '错误',
    index: '序号',
    keywordSearch: '请输入关键词搜索',
    logout: '退出登录',
    logoutConfirm: '确认退出登录吗？',
    lookForward: '敬请期待',
    modify: '修改',
    modifySuccess: '修改成功',
    noData: '无数据',
    operate: '操作',
    pleaseCheckValue: '请检查输入的值是否合法',
    refresh: '刷新',
    reset: '重置',
    search: '搜索',
    switch: '切换',
    tip: '提示',
    trigger: '触发',
    update: '更新',
    updateSuccess: '更新成功',
    userCenter: '个人中心',
    yesOrNo: {
      yes: '是',
      no: '否'
    }
  },
  request: {
    logout: '请求失败后登出用户',
    logoutMsg: '用户状态失效，请重新登录',
    logoutWithModal: '请求失败后弹出模态框再登出用户',
    logoutWithModalMsg: '用户状态失效，请重新登录',
    refreshToken: '请求的token已过期，刷新token',
    tokenExpired: 'token已过期'
  },
  theme: {
    themeDrawerTitle: '主题配置',
    tabs: {
      appearance: '外观',
      layout: '布局',
      general: '通用',
      preset: '预设'
    },
    appearance: {
      themeSchema: {
        title: '主题模式',
        light: '亮色模式',
        dark: '暗黑模式',
        auto: '跟随系统'
      },
      grayscale: '灰色模式',
      colourWeakness: '色弱模式',
      themeColor: {
        title: '主题颜色',
        primary: '主色',
        info: '信息色',
        success: '成功色',
        warning: '警告色',
        error: '错误色',
        followPrimary: '跟随主色'
      },
      themeRadius: {
        title: '主题圆角'
      },
      recommendColor: '应用推荐算法的颜色',
      recommendColorDesc: '推荐颜色的算法参照',
      preset: {
        title: '主题预设',
        apply: '应用',
        applySuccess: '预设应用成功',
        default: {
          name: '默认预设',
          desc: 'Soybean 默认主题预设'
        },
        dark: {
          name: '暗色预设',
          desc: '适用于夜间使用的暗色主题预设'
        },
        compact: {
          name: '紧凑型',
          desc: '适用于小屏幕的紧凑布局预设'
        },
        azir: {
          name: 'Azir的预设',
          desc: '是 Azir 比较喜欢的莫兰迪色系冷淡风'
        }
      }
    },
    layout: {
      layoutMode: {
        title: '布局模式',
        vertical: '左侧菜单模式',
        'vertical-mix': '左侧菜单混合模式',
        'vertical-hybrid-header-first': '左侧混合-顶部优先',
        horizontal: '顶部菜单模式',
        'top-hybrid-sidebar-first': '顶部混合-侧边优先',
        'top-hybrid-header-first': '顶部混合-顶部优先',
        vertical_detail: '左侧菜单布局，菜单在左，内容在右。',
        'vertical-mix_detail': '左侧双菜单布局，一级菜单在左侧深色区域，二级菜单在左侧浅色区域。',
        'vertical-hybrid-header-first_detail':
          '左侧混合布局，一级菜单在顶部，二级菜单在左侧深色区域，三级菜单在左侧浅色区域。',
        horizontal_detail: '顶部菜单布局，菜单在顶部，内容在下方。',
        'top-hybrid-sidebar-first_detail': '顶部混合布局，一级菜单在左侧，二级菜单在顶部。',
        'top-hybrid-header-first_detail': '顶部混合布局，一级菜单在顶部，二级菜单在左侧。'
      },
      tab: {
        title: '标签栏设置',
        visible: '显示标签栏',
        cache: '标签栏信息缓存',
        cacheTip: '离开页面后仍然保留标签栏信息',
        height: '标签栏高度',
        mode: {
          title: '标签栏风格',
          slider: '滑块风格',
          chrome: '谷歌风格',
          button: '按钮风格'
        },
        closeByMiddleClick: '鼠标中键关闭标签页',
        closeByMiddleClickTip: '启用后可以使用鼠标中键点击标签页进行关闭'
      },
      header: {
        title: '头部设置',
        height: '头部高度',
        breadcrumb: {
          visible: '显示面包屑',
          showIcon: '显示面包屑图标'
        }
      },
      sider: {
        title: '侧边栏设置',
        inverted: '深色侧边栏',
        width: '侧边栏宽度',
        collapsedWidth: '侧边栏折叠宽度',
        mixWidth: '混合布局侧边栏宽度',
        mixCollapsedWidth: '混合布局侧边栏折叠宽度',
        mixChildMenuWidth: '混合布局子菜单宽度',
        autoSelectFirstMenu: '自动选择第一个子菜单',
        autoSelectFirstMenuTip: '点击一级菜单时，自动选择并导航到第一个子菜单的最深层级'
      },
      footer: {
        title: '底部设置',
        visible: '显示底部',
        fixed: '固定底部',
        height: '底部高度',
        right: '底部居右'
      },
      content: {
        title: '内容区域设置',
        scrollMode: {
          title: '滚动模式',
          tip: '主题滚动仅 main 部分滚动，外层滚动可携带头部底部一起滚动',
          wrapper: '外层滚动',
          content: '主体滚动'
        },
        page: {
          animate: '页面切换动画',
          mode: {
            title: '页面切换动画类型',
            'fade-slide': '滑动',
            fade: '淡入淡出',
            'fade-bottom': '底部消退',
            'fade-scale': '缩放消退',
            'zoom-fade': '渐变',
            'zoom-out': '闪现',
            none: '无'
          }
        },
        fixedHeaderAndTab: '固定头部和标签栏'
      }
    },
    general: {
      title: '通用设置',
      watermark: {
        title: '水印设置',
        visible: '显示全屏水印',
        text: '自定义水印文本',
        enableUserName: '启用用户名水印',
        enableTime: '显示当前时间',
        timeFormat: '时间格式'
      },
      multilingual: {
        title: '多语言设置',
        visible: '显示多语言按钮'
      },
      globalSearch: {
        title: '全局搜索设置',
        visible: '显示全局搜索按钮'
      }
    },
    configOperation: {
      copyConfig: '复制配置',
      copySuccessMsg: '复制成功，请替换 src/theme/settings.ts 中的变量 themeSettings',
      resetConfig: '重置配置',
      resetSuccessMsg: '重置成功'
    }
  },
  route: {
    login: '登录',
    403: '无权限',
    404: '页面不存在',
    500: '服务器错误',
    'iframe-page': '外链页面',
    home: '首页',
    manage: '系统管理',
    manage_user: '用户管理',
    manage_role: '角色管理',
    manage_menu: '菜单管理',
    app: '应用管理',
    app_list: '应用',
    payment: '支付管理',
    payment_stats: '统计概览',
    payment_order: '支付订单',
    payment_refund: '退款订单',
    payment_channel: '通道交互',
    payment_channel_log: '通道交互日志',
    payment_operation: '订单操作记录'
  },
  page: {
    login: {
      common: {
        loginOrRegister: '登录 / 注册',
        userNamePlaceholder: '请输入用户名',
        phonePlaceholder: '请输入手机号',
        codePlaceholder: '请输入验证码',
        passwordPlaceholder: '请输入密码',
        confirmPasswordPlaceholder: '请再次输入密码',
        codeLogin: '验证码登录',
        confirm: '确定',
        back: '返回',
        validateSuccess: '验证成功',
        loginSuccess: '登录成功',
        welcomeBack: '欢迎回来，{userName} ！'
      },
      pwdLogin: {
        title: '密码登录',
        rememberMe: '记住我',
        forgetPassword: '忘记密码？',
        register: '注册账号',
        otherAccountLogin: '其他账号登录',
        otherLoginMode: '其他登录方式',
        superAdmin: '超级管理员',
        admin: '管理员',
        user: '普通用户'
      },
      codeLogin: {
        title: '验证码登录',
        getCode: '获取验证码',
        reGetCode: '{time}秒后重新获取',
        sendCodeSuccess: '验证码发送成功',
        imageCodePlaceholder: '请输入图片验证码'
      },
      register: {
        title: '注册账号',
        agreement: '我已经仔细阅读并接受',
        protocol: '《用户协议》',
        policy: '《隐私权政策》'
      },
      resetPwd: {
        title: '重置密码'
      },
      bindWeChat: {
        title: '绑定微信'
      }
    },
    home: {
      branchDesc:
        '为了方便大家开发和更新合并，我们对main分支的代码进行了精简，只保留了首页菜单，其余内容已移至example分支进行维护。预览地址显示的内容即为example分支的内容。',
      greeting: '早安，{userName}, 今天又是充满活力的一天!',
      weatherDesc: '今日多云转晴，20℃ - 25℃!',
      projectCount: '项目数',
      todo: '待办',
      message: '消息',
      downloadCount: '下载量',
      registerCount: '注册量',
      schedule: '作息安排',
      study: '学习',
      work: '工作',
      rest: '休息',
      entertainment: '娱乐',
      visitCount: '访问量',
      turnover: '成交额',
      dealCount: '成交量',
      projectNews: {
        title: '项目动态',
        moreNews: '更多动态',
        desc1: 'Soybean 在2021年5月28日创建了开源项目 soybean-admin!',
        desc2: 'Yanbowe 向 soybean-admin 提交了一个bug，多标签栏不会自适应。',
        desc3: 'Soybean 准备为 soybean-admin 的发布做充分的准备工作!',
        desc4: 'Soybean 正在忙于为soybean-admin写项目说明文档！',
        desc5: 'Soybean 刚才把工作台页面随便写了一些，凑合能看了！'
      },
      creativity: '创意'
    },
    manage: {
      common: {
        status: {
          enable: '启用',
          disable: '禁用'
        },
        enableSuccess: '已启用',
        disableSuccess: '已禁用',
        batchDeleteSuccess: '已删除 {count} 项',
        batchDeletePartial: '{success} 项成功、{fail} 项失败'
      },
      role: {
        title: '角色列表',
        roleName: '角色名称',
        roleCode: '角色编码',
        roleStatus: '角色状态',
        roleDesc: '角色描述',
        menuAuth: '菜单权限',
        buttonAuth: '按钮权限',
        order: '排序',
        keyword: '关键词',
        assignMenu: '分配菜单',
        assignPermission: '分配权限',
        superAdminCodeLocked: '超管编码不可修改',
        roleNameLengthRule: '名称长度不能超过 50',
        roleCodeRule: '编码须以字母开头，仅含字母、数字、下划线（≤50）',
        defaultHome: '默认首页',
        homePlaceholder: '选择落地页 route name（选填）',
        noMenuToAssign: '暂无可分配菜单',
        form: {
          roleName: '请输入角色名称',
          roleCode: '请输入角色编码',
          roleStatus: '请选择角色状态',
          roleDesc: '请输入描述',
          order: '数字越小越靠前',
          keyword: '名称/编码/描述'
        },
        addRole: '新增角色',
        editRole: '编辑角色'
      },
      user: {
        title: '用户列表',
        userName: '用户名',
        userGender: '性别',
        nickName: '昵称',
        userPhone: '手机号',
        userEmail: '邮箱',
        userStatus: '用户状态',
        userRole: '用户角色',
        password: '密码',
        createdAt: '创建时间',
        keyword: '关键词',
        resetPwd: '重置密码',
        assignRole: '分配角色',
        userNameRule: '4-20 位字母、数字或下划线',
        pwdRule: '8-20 位、须含字母+数字',
        noRoleToAssign: '暂无可分配角色',
        newPassword: '新密码',
        confirmPassword: '确认新密码',
        form: {
          userName: '请输入用户名',
          userGender: '请选择性别',
          nickName: '请输入昵称',
          userPhone: '请输入手机号',
          userEmail: '请输入邮箱',
          userStatus: '请选择状态',
          userRole: '请选择用户角色',
          password: '8-20 位、须含字母+数字',
          keyword: '用户名/昵称',
          confirmPassword: '请再次输入新密码'
        },
        addUser: '新增用户',
        editUser: '编辑用户',
        gender: {
          male: '男',
          female: '女'
        }
      },
      menu: {
        home: '首页',
        title: '菜单列表',
        id: 'ID',
        parentId: '父级菜单ID',
        menuType: '菜单类型',
        menuName: '菜单名称',
        routeName: '路由名称',
        routePath: '路由路径',
        pathParam: '路径参数',
        layout: '布局',
        page: '页面组件',
        i18nKey: '国际化key',
        icon: '图标',
        localIcon: '本地图标',
        iconTypeTitle: '图标类型',
        order: '排序',
        constant: '常量路由',
        keepAlive: '缓存路由',
        href: '外链',
        hideInMenu: '隐藏菜单',
        activeMenu: '高亮的菜单',
        multiTab: '支持多页签',
        fixedIndexInTab: '固定在页签中的序号',
        query: '路由参数',
        button: '按钮',
        buttonCode: '按钮编码',
        buttonDesc: '按钮描述',
        menuStatus: '菜单状态',
        routePathAuto: '由路由名称自动生成',
        i18nKeyAuto: '由路由名称自动生成',
        form: {
          home: '请选择首页',
          menuType: '请选择菜单类型',
          menuName: '请输入菜单名称',
          routeName: '请输入路由名称',
          routePath: '请输入路由路径',
          pathParam: '请输入路径参数',
          page: '请选择页面组件',
          layout: '请选择布局组件',
          i18nKey: '请输入国际化key',
          icon: '请输入图标',
          localIcon: '请选择本地图标',
          order: '请输入排序',
          keepAlive: '请选择是否缓存路由',
          href: '请输入外链',
          hideInMenu: '请选择是否隐藏菜单',
          activeMenu: '请选择高亮的菜单的路由名称',
          multiTab: '请选择是否支持多标签',
          fixedInTab: '请选择是否固定在页签中',
          fixedIndexInTab: '请输入固定在页签中的序号',
          queryKey: '请输入路由参数Key',
          queryValue: '请输入路由参数Value',
          button: '请选择是否按钮',
          buttonCode: '请输入按钮编码',
          buttonDesc: '请输入按钮描述',
          menuStatus: '请选择菜单状态'
        },
        addMenu: '新增菜单',
        editMenu: '编辑菜单',
        addChildMenu: '新增子菜单',
        updateSuccess: '更新成功，刷新页面后导航生效',
        addSuccess: '新增成功，刷新页面后导航生效',
        type: {
          directory: '目录',
          menu: '菜单'
        },
        iconType: {
          iconify: 'iconify图标',
          local: '本地图标'
        }
      },
      app: {
        title: '应用列表',
        appCode: '应用编码',
        appName: '应用名称',
        description: '描述',
        status: '状态',
        createdAt: '创建时间',
        updatedAt: '更新时间',
        keyword: '关键词',
        detail: '详情',
        createApp: '创建应用',
        deleteApp: '删除应用',
        apiKey: 'API Key',
        apiSecret: 'API Secret',
        ssoClient: 'SSO Client',
        clientId: 'Client ID',
        redirectUris: '回调地址',
        postLogoutRedirectUris: '登出回跳地址',
        scopes: '授权范围',
        grants: '授权类型',
        ssoConfig: 'SSO 配置',
        saveSsoConfig: '保存配置',
        uriRequired: '回调地址与登出回跳地址均不能为空',
        uriPlaceholder: '请输入完整 URI',
        notGenerated: '未生成',
        generateSecret: '生成 Secret',
        resetSecret: '重置 Secret',
        provisionSso: '开通 SSO',
        resetSsoSecret: '重置密钥',
        ssoNotProvisioned: 'SSO 未开通',
        ssoNotProvisionedHint: '开通后将生成终身稳定的 Client ID，并一次性展示 Client Secret。',
        save: '保存',
        basicInfo: '基本信息',
        secretModal: {
          title: '密钥已生成',
          description: '以下密钥仅展示一次，请立即复制并妥善保存'
        },
        resetSecretConfirm: {
          title: '重置 API Secret',
          content: '此操作会使原有密钥立即失效，使用旧密钥的调用将全部失败。确定继续吗？'
        },
        resetSsoSecretConfirm: {
          title: '重置密钥',
          content: '此操作会使原有 client_secret 立即失效，使用旧密钥的接入将全部失败。Client ID 保持不变。确定继续吗？'
        },
        ssoEnableSuccess: 'SSO 已启用',
        ssoDisableSuccess: 'SSO 已禁用',
        appCodeRule: '4-64位小写字母、数字或连字符',
        appNameLengthRule: '名称长度不能超过 128',
        appDescriptionLengthRule: '描述长度不能超过 512',
        copy: '复制',
        copySuccess: '已复制',
        masked: '已生成（脱敏）',
        form: {
          appCode: '请输入应用编码',
          appName: '请输入应用名称',
          description: '请输入描述',
          keyword: '应用名称/编码'
        }
      },
      permission: {
        module: {
          user: '用户',
          role: '角色',
          menu: '菜单',
          permission: '权限'
        },
        noPermissionToAssign: '暂无可分配权限'
      }
    },
    payment: {
      common: {
        comingSoon: '即将上线'
      },
      order: {
        title: '支付订单',
        paymentOrderNo: '支付订单号',
        businessOrderNo: '业务订单号',
        businessSystemName: '业务系统',
        status: '状态',
        amount: '金额',
        amountRange: '金额区间',
        amountMin: '最低（元）',
        amountMax: '最高（元）',
        payMode: '支付方式',
        accessType: '接入类型',
        paymentChannel: '支付通道',
        paidAt: '支付时间',
        createdAt: '创建时间',
        moreFilters: '更多筛选',
        detail: '详情',
        basicInfo: '基本信息',
        lifecycle: '生命周期',
        resendNotification: '通知重发',
        resendConfirm: {
          title: '通知重发确认',
          content: '将向业务系统补发该订单的支付结果通知（仅补发投递，不改变订单状态）。是否继续？'
        },
        resendSuccess: '通知重发已提交',
        form: {
          paymentOrderNo: '请输入支付订单号',
          businessOrderNo: '请输入业务订单号',
          businessSystemName: '请输入业务系统名',
          status: '请选择状态',
          payMode: '请选择支付方式',
          accessType: '请选择接入类型',
          paymentChannel: '请选择支付通道',
          createdAt: '请选择创建时间范围',
          paidAt: '请选择支付时间范围'
        }
      },
      enum: {
        paymentStatus: {
          pending: '待支付',
          paid: '已支付',
          failed: '支付失败',
          cancelled: '已取消',
          expired: '已过期'
        },
        payMode: {
          wechat: '微信',
          alipay: '支付宝',
          unionpay: '云闪付'
        },
        accessType: {
          h5: 'H5',
          app: 'APP',
          wechatOa: '微信公众号',
          alipayLife: '支付宝生活号',
          miniProgram: '小程序'
        },
        paymentChannel: {
          icbc: '工商银行'
        },
        refundStatus: {
          pending: '待审核',
          rejected: '已拒绝',
          approved: '已批准',
          refunding: '退款中',
          success: '退款成功',
          failed: '退款失败'
        },
        auditType: {
          auto: '免审',
          manual: '人工审核'
        },
        logType: {
          paymentRequest: '支付请求',
          paymentQuery: '支付查询',
          paymentCancel: '支付取消',
          refundRequest: '退款请求',
          refundQuery: '退款查询',
          paymentCallback: '支付回调'
        },
        operationType: {
          auditApprove: '审核通过',
          auditReject: '审核拒绝',
          notifyResend: '通知重发'
        },
        operationTargetType: {
          payment: '支付订单',
          refund: '退款订单'
        }
      },
      lifecycle: {
        success: '成功',
        fail: '失败',
        unknown: '未知',
        executionTime: '耗时',
        returnCode: '返回码',
        returnMsg: '返回消息',
        bankInterface: '银行接口',
        operator: '操作人',
        remark: '备注',
        noEvents: '暂无生命周期事件'
      }
    }
  },
  form: {
    required: '不能为空',
    userName: {
      required: '请输入用户名',
      invalid: '用户名格式不正确'
    },
    phone: {
      required: '请输入手机号',
      invalid: '手机号格式不正确'
    },
    pwd: {
      required: '请输入密码',
      invalid: '密码格式不正确，6-18位字符，包含字母、数字、下划线'
    },
    confirmPwd: {
      required: '请输入确认密码',
      invalid: '两次输入密码不一致'
    },
    code: {
      required: '请输入验证码',
      invalid: '验证码格式不正确'
    },
    email: {
      required: '请输入邮箱',
      invalid: '邮箱格式不正确'
    }
  },
  dropdown: {
    closeCurrent: '关闭',
    closeOther: '关闭其它',
    closeLeft: '关闭左侧',
    closeRight: '关闭右侧',
    closeAll: '关闭所有',
    pin: '固定标签',
    unpin: '取消固定'
  },
  icon: {
    themeConfig: '主题配置',
    themeSchema: '主题模式',
    lang: '切换语言',
    fullscreen: '全屏',
    fullscreenExit: '退出全屏',
    reload: '刷新页面',
    collapse: '折叠菜单',
    expand: '展开菜单',
    pin: '固定',
    unpin: '取消固定'
  },
  datatable: {
    itemCount: '共 {total} 条',
    fixed: {
      left: '左固定',
      right: '右固定',
      unFixed: '取消固定'
    }
  }
};

export default local;
