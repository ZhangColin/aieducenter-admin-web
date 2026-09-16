const local: App.I18n.Schema = {
  system: {
    title: 'SoybeanAdmin',
    updateTitle: 'System Version Update Notification',
    updateContent: 'A new version of the system has been detected. Do you want to refresh the page immediately?',
    updateConfirm: 'Refresh immediately',
    updateCancel: 'Later'
  },
  common: {
    action: 'Action',
    add: 'Add',
    addSuccess: 'Add Success',
    back: 'Back',
    backToHome: 'Back to home',
    batchDelete: 'Batch Delete',
    cancel: 'Cancel',
    close: 'Close',
    check: 'Check',
    selectAll: 'Select All',
    expandColumn: 'Expand Column',
    columnSetting: 'Column Setting',
    config: 'Config',
    confirm: 'Confirm',
    delete: 'Delete',
    deleteSuccess: 'Delete Success',
    confirmDelete: 'Are you sure you want to delete?',
    edit: 'Edit',
    warning: 'Warning',
    error: 'Error',
    index: 'Index',
    keywordSearch: 'Please enter keyword',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    lookForward: 'Coming soon',
    modify: 'Modify',
    modifySuccess: 'Modify Success',
    noData: 'No Data',
    operate: 'Operate',
    pleaseCheckValue: 'Please check whether the value is valid',
    refresh: 'Refresh',
    reset: 'Reset',
    search: 'Search',
    switch: 'Switch',
    tip: 'Tip',
    trigger: 'Trigger',
    update: 'Update',
    updateSuccess: 'Update Success',
    userCenter: 'User Center',
    yesOrNo: {
      yes: 'Yes',
      no: 'No'
    }
  },
  request: {
    logout: 'Logout user after request failed',
    logoutMsg: 'User status is invalid, please log in again',
    logoutWithModal: 'Pop up modal after request failed and then log out user',
    logoutWithModalMsg: 'User status is invalid, please log in again',
    refreshToken: 'The requested token has expired, refresh the token',
    tokenExpired: 'The requested token has expired'
  },
  theme: {
    themeDrawerTitle: 'Theme Configuration',
    tabs: {
      appearance: 'Appearance',
      layout: 'Layout',
      general: 'General',
      preset: 'Preset'
    },
    appearance: {
      themeSchema: {
        title: 'Theme Schema',
        light: 'Light',
        dark: 'Dark',
        auto: 'Follow System'
      },
      grayscale: 'Grayscale',
      colourWeakness: 'Colour Weakness',
      themeColor: {
        title: 'Theme Color',
        primary: 'Primary',
        info: 'Info',
        success: 'Success',
        warning: 'Warning',
        error: 'Error',
        followPrimary: 'Follow Primary'
      },
      themeRadius: {
        title: 'Theme Radius'
      },
      recommendColor: 'Apply Recommended Color Algorithm',
      recommendColorDesc: 'The recommended color algorithm refers to',
      preset: {
        title: 'Theme Presets',
        apply: 'Apply',
        applySuccess: 'Preset applied successfully',
        default: {
          name: 'Default Preset',
          desc: 'Default theme preset with balanced settings'
        },
        dark: {
          name: 'Dark Preset',
          desc: 'Dark theme preset for night time usage'
        },
        compact: {
          name: 'Compact Preset',
          desc: 'Compact layout preset for small screens'
        },
        azir: {
          name: "Azir's Preset",
          desc: 'It is a cold and elegant preset that Azir likes'
        }
      }
    },
    layout: {
      layoutMode: {
        title: 'Layout Mode',
        vertical: 'Vertical Mode',
        horizontal: 'Horizontal Mode',
        'vertical-mix': 'Vertical Mix Mode',
        'vertical-hybrid-header-first': 'Left Hybrid Header-First',
        'top-hybrid-sidebar-first': 'Top-Hybrid Sidebar-First',
        'top-hybrid-header-first': 'Top-Hybrid Header-First',
        vertical_detail: 'Vertical menu layout, with the menu on the left and content on the right.',
        'vertical-mix_detail':
          'Vertical mix-menu layout, with the primary menu on the dark left side and the secondary menu on the lighter left side.',
        'vertical-hybrid-header-first_detail':
          'Left hybrid layout, with the primary menu at the top, the secondary menu on the dark left side, and the tertiary menu on the lighter left side.',
        horizontal_detail: 'Horizontal menu layout, with the menu at the top and content below.',
        'top-hybrid-sidebar-first_detail':
          'Top hybrid layout, with the primary menu on the left and the secondary menu at the top.',
        'top-hybrid-header-first_detail':
          'Top hybrid layout, with the primary menu at the top and the secondary menu on the left.'
      },
      tab: {
        title: 'Tab Settings',
        visible: 'Tab Visible',
        cache: 'Tag Bar Info Cache',
        cacheTip: 'Keep the tab bar information after leaving the page',
        height: 'Tab Height',
        mode: {
          title: 'Tab Mode',
          slider: 'Slider',
          chrome: 'Chrome',
          button: 'Button'
        },
        closeByMiddleClick: 'Close Tab by Middle Click',
        closeByMiddleClickTip: 'Enable closing tabs by clicking with the middle mouse button'
      },
      header: {
        title: 'Header Settings',
        height: 'Header Height',
        breadcrumb: {
          visible: 'Breadcrumb Visible',
          showIcon: 'Breadcrumb Icon Visible'
        }
      },
      sider: {
        title: 'Sider Settings',
        inverted: 'Dark Sider',
        width: 'Sider Width',
        collapsedWidth: 'Sider Collapsed Width',
        mixWidth: 'Mix Sider Width',
        mixCollapsedWidth: 'Mix Sider Collapse Width',
        mixChildMenuWidth: 'Mix Child Menu Width',
        autoSelectFirstMenu: 'Auto Select First Submenu',
        autoSelectFirstMenuTip:
          'When a first-level menu is clicked, the first submenu is automatically selected and navigated to the deepest level'
      },
      footer: {
        title: 'Footer Settings',
        visible: 'Footer Visible',
        fixed: 'Fixed Footer',
        height: 'Footer Height',
        right: 'Right Footer'
      },
      content: {
        title: 'Content Area Settings',
        scrollMode: {
          title: 'Scroll Mode',
          tip: 'The theme scroll only scrolls the main part, the outer scroll can carry the header and footer together',
          wrapper: 'Wrapper',
          content: 'Content'
        },
        page: {
          animate: 'Page Animate',
          mode: {
            title: 'Page Animate Mode',
            fade: 'Fade',
            'fade-slide': 'Slide',
            'fade-bottom': 'Fade Zoom',
            'fade-scale': 'Fade Scale',
            'zoom-fade': 'Zoom Fade',
            'zoom-out': 'Zoom Out',
            none: 'None'
          }
        },
        fixedHeaderAndTab: 'Fixed Header And Tab'
      }
    },
    general: {
      title: 'General Settings',
      watermark: {
        title: 'Watermark Settings',
        visible: 'Watermark Full Screen Visible',
        text: 'Custom Watermark Text',
        enableUserName: 'Enable User Name Watermark',
        enableTime: 'Show Current Time',
        timeFormat: 'Time Format'
      },
      multilingual: {
        title: 'Multilingual Settings',
        visible: 'Display multilingual button'
      },
      globalSearch: {
        title: 'Global Search Settings',
        visible: 'Display GlobalSearch button'
      }
    },
    configOperation: {
      copyConfig: 'Copy Config',
      copySuccessMsg: 'Copy Success, Please replace the variable "themeSettings" in "src/theme/settings.ts"',
      resetConfig: 'Reset Config',
      resetSuccessMsg: 'Reset Success'
    }
  },
  route: {
    login: 'Login',
    403: 'No Permission',
    404: 'Page Not Found',
    500: 'Server Error',
    'iframe-page': 'Iframe',
    home: 'Home',
    manage: 'System',
    manage_user: 'User Manage',
    manage_role: 'Role Manage',
    manage_menu: 'Menu Manage',
    app: 'App Management',
    app_list: 'Apps',
    payment: 'Payment',
    payment_stats: 'Stats Overview',
    payment_order: 'Payment Orders',
    payment_refund: 'Refund Orders',
    payment_channel: 'Channel',
    payment_channel_log: 'Channel Logs',
    payment_operation: 'Operation Logs',
    account: 'Accounts',
    account_list: 'Account List',
    aiplatform: 'AI Platform',
    aiplatform_order: 'Orders',
    aiplatform_project: 'Projects'
  },
  page: {
    login: {
      common: {
        loginOrRegister: 'Login / Register',
        userNamePlaceholder: 'Please enter user name',
        phonePlaceholder: 'Please enter phone number',
        codePlaceholder: 'Please enter verification code',
        passwordPlaceholder: 'Please enter password',
        confirmPasswordPlaceholder: 'Please enter password again',
        codeLogin: 'Verification code login',
        confirm: 'Confirm',
        back: 'Back',
        validateSuccess: 'Verification passed',
        loginSuccess: 'Login successfully',
        welcomeBack: 'Welcome back, {userName} !'
      },
      pwdLogin: {
        title: 'Password Login',
        rememberMe: 'Remember me',
        forgetPassword: 'Forget password?',
        register: 'Register',
        otherAccountLogin: 'Other Account Login',
        otherLoginMode: 'Other Login Mode',
        superAdmin: 'Super Admin',
        admin: 'Admin',
        user: 'User'
      },
      codeLogin: {
        title: 'Verification Code Login',
        getCode: 'Get verification code',
        reGetCode: 'Reacquire after {time}s',
        sendCodeSuccess: 'Verification code sent successfully',
        imageCodePlaceholder: 'Please enter image verification code'
      },
      register: {
        title: 'Register',
        agreement: 'I have read and agree to',
        protocol: '《User Agreement》',
        policy: '《Privacy Policy》'
      },
      resetPwd: {
        title: 'Reset Password'
      },
      bindWeChat: {
        title: 'Bind WeChat'
      }
    },
    home: {
      branchDesc:
        'For the convenience of everyone in developing and updating the merge, we have streamlined the code of the main branch, only retaining the homepage menu, and the rest of the content has been moved to the example branch for maintenance. The preview address displays the content of the example branch.',
      greeting: 'Good morning, {userName}, today is another day full of vitality!',
      weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
      projectCount: 'Project Count',
      todo: 'Todo',
      message: 'Message',
      downloadCount: 'Download Count',
      registerCount: 'Register Count',
      schedule: 'Work and rest Schedule',
      study: 'Study',
      work: 'Work',
      rest: 'Rest',
      entertainment: 'Entertainment',
      visitCount: 'Visit Count',
      turnover: 'Turnover',
      dealCount: 'Deal Count',
      projectNews: {
        title: 'Project News',
        moreNews: 'More News',
        desc1: 'Soybean created the open source project soybean-admin on May 28, 2021!',
        desc2: 'Yanbowe submitted a bug to soybean-admin, the multi-tab bar will not adapt.',
        desc3: 'Soybean is ready to do sufficient preparation for the release of soybean-admin!',
        desc4: 'Soybean is busy writing project documentation for soybean-admin!',
        desc5: 'Soybean just wrote some of the workbench pages casually, and it was enough to see!'
      },
      creativity: 'Creativity'
    },
    manage: {
      common: {
        status: {
          enable: 'Enable',
          disable: 'Disable'
        },
        enableSuccess: 'Enabled',
        disableSuccess: 'Disabled',
        batchDeleteSuccess: 'Deleted {count} item(s)',
        batchDeletePartial: '{success} succeeded, {fail} failed'
      },
      role: {
        title: 'Role List',
        roleName: 'Role Name',
        roleCode: 'Role Code',
        roleStatus: 'Role Status',
        roleDesc: 'Role Description',
        menuAuth: 'Menu Auth',
        buttonAuth: 'Button Auth',
        order: 'Order',
        keyword: 'Keyword',
        assignMenu: 'Assign Menu',
        assignPermission: 'Assign Permission',
        superAdminCodeLocked: 'Super admin code cannot be modified',
        roleNameLengthRule: 'Name length cannot exceed 50',
        roleCodeRule: 'Code must start with a letter; only letters, digits, underscores (≤50)',
        defaultHome: 'Default Home',
        homePlaceholder: 'Landing page route name (optional)',
        noMenuToAssign: 'No menus to assign',
        form: {
          roleName: 'Please enter role name',
          roleCode: 'Please enter role code',
          roleStatus: 'Please select role status',
          roleDesc: 'Please enter description',
          order: 'Smaller number comes first',
          keyword: 'Name / Code / Desc'
        },
        addRole: 'Add Role',
        editRole: 'Edit Role'
      },
      user: {
        title: 'User List',
        userName: 'User Name',
        userGender: 'Gender',
        nickName: 'Nick Name',
        userPhone: 'Phone Number',
        userEmail: 'Email',
        userStatus: 'User Status',
        userRole: 'User Role',
        password: 'Password',
        createdAt: 'Created At',
        keyword: 'Keyword',
        resetPwd: 'Reset Password',
        assignRole: 'Assign Role',
        userNameRule: '4-20 letters, digits or underscores',
        pwdRule: '8-20 chars, must include letter + digit',
        noRoleToAssign: 'No roles to assign',
        newPassword: 'New Password',
        confirmPassword: 'Confirm New Password',
        form: {
          userName: 'Please enter user name',
          userGender: 'Please select gender',
          nickName: 'Please enter nick name',
          userPhone: 'Please enter phone number',
          userEmail: 'Please enter email',
          userStatus: 'Please select status',
          userRole: 'Please select user role',
          password: '8-20 chars, must include letter + digit',
          keyword: 'Username / Nickname',
          confirmPassword: 'Please enter the new password again'
        },
        addUser: 'Add User',
        editUser: 'Edit User',
        gender: {
          male: 'Male',
          female: 'Female'
        }
      },
      menu: {
        home: 'Home',
        title: 'Menu List',
        id: 'ID',
        parentId: 'Parent ID',
        menuType: 'Menu Type',
        menuName: 'Menu Name',
        routeName: 'Route Name',
        routePath: 'Route Path',
        pathParam: 'Path Param',
        layout: 'Layout Component',
        page: 'Page Component',
        i18nKey: 'I18n Key',
        icon: 'Icon',
        localIcon: 'Local Icon',
        iconTypeTitle: 'Icon Type',
        order: 'Order',
        constant: 'Constant',
        keepAlive: 'Keep Alive',
        href: 'Href',
        hideInMenu: 'Hide In Menu',
        activeMenu: 'Active Menu',
        multiTab: 'Multi Tab',
        fixedIndexInTab: 'Fixed Index In Tab',
        query: 'Query Params',
        button: 'Button',
        buttonCode: 'Button Code',
        buttonDesc: 'Button Desc',
        menuStatus: 'Menu Status',
        routePathAuto: 'Auto-generated from route name',
        i18nKeyAuto: 'Auto-generated from route name',
        form: {
          home: 'Please select home',
          menuType: 'Please select menu type',
          menuName: 'Please enter menu name',
          routeName: 'Please enter route name',
          routePath: 'Please enter route path',
          pathParam: 'Please enter path param',
          page: 'Please select page component',
          layout: 'Please select layout component',
          i18nKey: 'Please enter i18n key',
          icon: 'Please enter icon',
          localIcon: 'Please select local icon',
          order: 'Please enter order',
          keepAlive: 'Please select whether to cache route',
          href: 'Please enter href',
          hideInMenu: 'Please select whether to hide menu',
          activeMenu: 'Please select route name of the highlighted menu',
          multiTab: 'Please select whether to support multiple tabs',
          fixedInTab: 'Please select whether to fix in the tab',
          fixedIndexInTab: 'Please enter the index fixed in the tab',
          queryKey: 'Please enter route parameter Key',
          queryValue: 'Please enter route parameter Value',
          button: 'Please select whether it is a button',
          buttonCode: 'Please enter button code',
          buttonDesc: 'Please enter button description',
          menuStatus: 'Please select menu status'
        },
        addMenu: 'Add Menu',
        editMenu: 'Edit Menu',
        addChildMenu: 'Add Child Menu',
        updateSuccess: 'Update successful, refresh the page for navigation to take effect',
        addSuccess: 'Added successfully, refresh the page for navigation to take effect',
        type: {
          directory: 'Directory',
          menu: 'Menu'
        },
        iconType: {
          iconify: 'Iconify Icon',
          local: 'Local Icon'
        }
      },
      app: {
        title: 'App List',
        appCode: 'App Code',
        appName: 'App Name',
        description: 'Description',
        status: 'Status',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        keyword: 'Keyword',
        detail: 'Detail',
        createApp: 'Create App',
        deleteApp: 'Delete App',
        apiKey: 'API Key',
        apiSecret: 'API Secret',
        ssoClient: 'SSO Client',
        clientId: 'Client ID',
        redirectUris: 'Redirect URIs',
        postLogoutRedirectUris: 'Post-Logout Redirect URIs',
        scopes: 'Scopes',
        grants: 'Grants',
        ssoConfig: 'SSO Config',
        saveSsoConfig: 'Save Config',
        uriRequired: 'Redirect URIs and post-logout redirect URIs must not be empty',
        uriPlaceholder: 'Enter a full URI',
        notGenerated: 'Not Generated',
        generateSecret: 'Generate Secret',
        resetSecret: 'Reset Secret',
        provisionSso: 'Provision SSO',
        resetSsoSecret: 'Reset Secret',
        ssoNotProvisioned: 'SSO Not Provisioned',
        ssoNotProvisionedHint: 'Provisioning generates a stable Client ID and reveals the Client Secret only once.',
        save: 'Save',
        basicInfo: 'Basic Info',
        secretModal: {
          title: 'Secret Generated',
          description: 'This secret will only be displayed once. Please copy and save it securely.'
        },
        resetSecretConfirm: {
          title: 'Reset API Secret',
          content: 'This will invalidate the existing secret immediately. All calls using the old secret will fail. Continue?'
        },
        resetSsoSecretConfirm: {
          title: 'Reset Secret',
          content: 'This will invalidate the existing client_secret immediately. All integrations using the old secret will fail. The Client ID stays the same. Continue?'
        },
        ssoEnableSuccess: 'SSO enabled',
        ssoDisableSuccess: 'SSO disabled',
        appCodeRule: '4-64 lowercase letters, digits or hyphens',
        appNameLengthRule: 'Name length cannot exceed 128',
        appDescriptionLengthRule: 'Description length cannot exceed 512',
        copy: 'Copy',
        copySuccess: 'Copied',
        masked: 'Generated (Masked)',
        form: {
          appCode: 'Please enter app code',
          appName: 'Please enter app name',
          description: 'Please enter description',
          keyword: 'App name/code'
        }
      },
      permission: {
        module: {
          user: 'User',
          role: 'Role',
          menu: 'Menu',
          permission: 'Permission'
        },
        noPermissionToAssign: 'No permissions to assign'
      }
    },
    payment: {
      stats: {
        refresh: 'Refresh',
        states: {
          loadFailed: 'Load failed',
          noData: 'No data'
        },
        overview: {
          title: 'Payment Overview',
          paymentCount: 'Payment Count',
          paymentAmount: 'Payment Amount',
          refundCount: 'Refund Count',
          refundAmount: 'Refund Amount',
          successRate: 'Payment Success Rate',
          netAmount: 'Net Amount'
        },
        statusDistribution: {
          title: 'Order Status Distribution',
          paymentStatus: 'Payment Status',
          refundStatus: 'Refund Status',
          refundBacklog: 'Refund Pending Audit',
          backlogCount: 'orders',
          backlogAmount: 'backlog amount'
        },
        gatewayHealth: {
          title: 'Gateway Health',
          bankInterface: 'Bank Interface',
          totalCount: 'Total Calls',
          successCount: 'Success Count',
          successRate: 'Success Rate',
          avgExecutionTimeMs: 'Avg. Latency (ms)',
          returnCodes: 'Return Codes'
        },
        operationsAudit: {
          title: 'Audit Stats',
          totalAudits: 'Total Audits',
          auditCount: 'Audit Count',
          approvedCount: 'Approved',
          rejectedCount: 'Rejected',
          approvalRate: 'Approval Rate',
          avgDuration: 'Avg. Audit Duration (min)',
          auditor: 'Auditor'
        },
        byBusinessSystem: {
          title: 'By Business System',
          paymentCount: 'Payment Count',
          refundCount: 'Refund Count'
        },
        byChannel: {
          title: 'By Channel',
          byPayMode: 'By Pay Mode',
          byAccessType: 'By Access Type',
          paymentCount: 'Payment Count'
        },
        anomalies: {
          title: 'Anomalies',
          longPending: 'Long-Pending Payments',
          longRefunding: 'Long-Refunding Refunds',
          recentFailure: 'Recent Failures',
          count: 'orders',
          healthy: 'No anomalies'
        },
        operationsActivity: {
          title: 'Operator Activity'
        }
      },
      order: {
        title: 'Payment Orders',
        paymentOrderNo: 'Payment Order No.',
        businessOrderNo: 'Business Order No.',
        businessSystemName: 'Business System',
        status: 'Status',
        amount: 'Amount',
        amountRange: 'Amount Range',
        amountMin: 'Min (CNY)',
        amountMax: 'Max (CNY)',
        payMode: 'Pay Mode',
        accessType: 'Access Type',
        paymentChannel: 'Payment Channel',
        paidAt: 'Paid At',
        createdAt: 'Created At',
        moreFilters: 'More Filters',
        detail: 'Detail',
        basicInfo: 'Basic Info',
        lifecycle: 'Lifecycle',
        resendNotification: 'Resend Notification',
        resendConfirm: {
          title: 'Resend Notification',
          content: 'This will resend the payment result notification to the business system (delivery only, order status unchanged). Continue?'
        },
        resendSuccess: 'Notification resend submitted',
        form: {
          paymentOrderNo: 'Enter payment order no.',
          businessOrderNo: 'Enter business order no.',
          businessSystemName: 'Enter business system name',
          status: 'Select status',
          payMode: 'Select pay mode',
          accessType: 'Select access type',
          paymentChannel: 'Select payment channel',
          createdAt: 'Select created-at range',
          paidAt: 'Select paid-at range'
        }
      },
      refund: {
        title: 'Refund Orders',
        refundOrderNo: 'Refund Order No.',
        paymentOrderNo: 'Payment Order No.',
        businessOrderNo: 'Business Order No.',
        businessSystemName: 'Business System',
        status: 'Status',
        refundAmount: 'Refund Amount',
        refundAmountRange: 'Refund Amount Range',
        refundAmountMin: 'Min (CNY)',
        refundAmountMax: 'Max (CNY)',
        auditType: 'Audit Type',
        auditor: 'Auditor',
        auditorId: 'Auditor ID',
        createdAt: 'Created At',
        moreFilters: 'More Filters',
        detail: 'Detail',
        basicInfo: 'Basic Info',
        lifecycle: 'Lifecycle',
        resendNotification: 'Resend Notification',
        resendConfirm: {
          title: 'Resend Notification',
          content: 'This will resend the refund result notification to the business system (delivery only, order status unchanged). Continue?'
        },
        resendSuccess: 'Notification resend submitted',
        audit: 'Audit',
        auditTitle: 'Refund Audit',
        auditDecision: 'Decision',
        auditApprove: 'Approve',
        auditReject: 'Reject',
        auditReason: 'Remark',
        auditReasonPlaceholder: 'Enter remark (required when rejecting)',
        auditReasonRequired: 'Remark is required when rejecting',
        auditReasonMax: 'Remark cannot exceed 512 characters',
        auditSuccess: 'Refund audit submitted',
        form: {
          refundOrderNo: 'Enter refund order no.',
          paymentOrderNo: 'Enter payment order no.',
          businessOrderNo: 'Enter business order no.',
          businessSystemName: 'Enter business system name',
          status: 'Select status',
          auditType: 'Select audit type',
          auditorId: 'Enter auditor ID',
          createdAt: 'Select created-at range'
        }
      },
      channelLog: {
        title: 'Channel Interaction Logs',
        paymentOrderNo: 'Payment Order No.',
        refundOrderNo: 'Refund Order No.',
        logType: 'Log Type',
        httpStatus: 'HTTP Status',
        errorMessage: 'Error Message',
        success: 'Result',
        createdAt: 'Created At',
        moreFilters: 'More Filters',
        form: {
          paymentOrderNo: 'Enter payment order no.',
          refundOrderNo: 'Enter refund order no.',
          logType: 'Select log type',
          bankInterface: 'Enter bank interface',
          success: 'Select result',
          returnCode: 'Enter return code',
          createdAt: 'Select created-at range'
        }
      },
      operation: {
        title: 'Order Operation Logs',
        targetType: 'Target Type',
        targetNo: 'Target No.',
        operation: 'Operation',
        operatorSystem: 'Source System',
        result: 'Result',
        createdAt: 'Created At',
        moreFilters: 'More Filters',
        form: {
          targetType: 'Select target type',
          targetNo: 'Enter target no.',
          operation: 'Select operation',
          operatorId: 'Enter operator ID',
          operatorSystem: 'Enter source system',
          result: 'Enter result',
          createdAt: 'Select created-at range'
        }
      },
      enum: {
        paymentStatus: {
          pending: 'Pending',
          paid: 'Paid',
          failed: 'Failed',
          cancelled: 'Cancelled',
          expired: 'Expired'
        },
        payMode: {
          wechat: 'WeChat',
          alipay: 'Alipay',
          unionpay: 'UnionPay'
        },
        accessType: {
          app: 'App',
          wechatOa: 'WeChat OA',
          alipayLife: 'Alipay Life',
          miniProgram: 'Mini Program'
        },
        paymentChannel: {
          icbc: 'ICBC'
        },
        refundStatus: {
          pending: 'Pending',
          rejected: 'Rejected',
          approved: 'Approved',
          refunding: 'Refunding',
          success: 'Success',
          failed: 'Failed'
        },
        auditType: {
          auto: 'Auto',
          manual: 'Manual'
        },
        logType: {
          paymentRequest: 'Payment Request',
          paymentQuery: 'Payment Query',
          paymentCancel: 'Payment Cancel',
          refundRequest: 'Refund Request',
          refundQuery: 'Refund Query',
          paymentCallback: 'Payment Callback'
        },
        operationType: {
          auditApprove: 'Audit Approve',
          auditReject: 'Audit Reject',
          notifyResend: 'Notify Resend'
        },
        operationTargetType: {
          payment: 'Payment',
          refund: 'Refund'
        }
      },
      lifecycle: {
        success: 'Success',
        fail: 'Fail',
        unknown: 'Unknown',
        executionTime: 'Duration',
        returnCode: 'Return Code',
        returnMsg: 'Return Message',
        bankInterface: 'Bank Interface',
        operator: 'Operator',
        remark: 'Remark',
        performer: 'Performer',
        detail: 'Detail',
        noEvents: 'No lifecycle events'
      }
    },
    account: {
      title: 'Platform Accounts',
      detailTitle: 'Account Detail',
      userId: 'User ID',
      nickname: 'Nickname',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      locked: 'Locked',
      detail: 'View',
      more: 'Actions',
      form: {
        email: 'Email (fuzzy)',
        phone: 'Phone (fuzzy)',
        userId: 'User ID (exact)',
        status: 'Status',
        locked: 'Locked',
        createdRange: 'Registered at'
      },
      statusEnum: {
        active: 'Active',
        disabled: 'Disabled',
        locked: 'Locked',
        unlocked: 'Unlocked'
      },
      banner: {
        active: 'Active',
        locked: 'Active · System Locked',
        disabled: 'Disabled',
        disabledLocked: 'Disabled · System Locked'
      },
      action: {
        disable: 'Disable',
        activate: 'Activate',
        unlock: 'Unlock',
        revoke: 'Force Logout'
      },
      confirm: {
        target: 'Account {name} ({userId})',
        activate: 'Activate this account?',
        unlock: 'Release the system lock on this account?',
        revoke: 'Revoke all sessions of this account?'
      },
      disableModal: {
        title: 'Disable Account',
        tip: 'Account {name} will be disabled; all sessions expire immediately.',
        reasonPlaceholder: 'Reason (required)',
        confirm: 'Confirm'
      },
      success: {
        disabled: 'Disabled — all sessions revoked',
        activated: 'Activated — user must sign in again',
        unlocked: 'System lock released',
        revoked: 'All sessions revoked'
      }
    },
    aiplatform: {
      order: {
        title: 'Order Management',
        detailTitle: 'Order Detail',
        orderId: 'Order ID',
        projectId: 'Project ID',
        projectName: 'Project',
        owner: 'Owner',
        status: 'Status',
        amount: 'Amount',
        createdAt: 'Created At',
        quotedAt: 'Quoted At',
        detail: 'View',
        more: 'Actions',
        form: {
          status: 'Status (multi-select)',
          createdRange: 'Created At',
          externalId: 'Account External ID',
          orderId: 'Order ID (exact)'
        },
        statusEnum: {
          pendingQuote: 'Pending Quote',
          quoted: 'Quoted',
          paid: 'Paid',
          archived: 'Archived',
          cancelled: 'Cancelled'
        },
        drawer: {
          priceHistory: 'Price History',
          prdSnapshot: 'PRD Snapshot',
          priceAmount: 'Amount',
          priceNote: 'Note',
          priceOperator: 'Operator',
          priceAt: 'Time',
          paidAt: 'Paid At',
          archivedAt: 'Archived At',
          archiveOperator: 'Archive Operator',
          cancelledAt: 'Cancelled At',
          cancelReason: 'Cancel Reason',
          cancelOperator: 'Cancel Operator',
          downloadPackage: 'Download Source Package'
        },
        action: {
          quote: 'Quote',
          requote: 'Re-quote',
          cancel: 'Cancel Order',
          retryArchive: 'Retry Archive'
        },
        quoteModal: {
          title: 'Submit Quote',
          requoteTitle: 'Update Quote',
          amount: 'Quote Amount (CNY)',
          note: 'Quote Note',
          amountPlaceholder: 'Enter quote amount',
          notePlaceholder: 'Optional, up to 1000 characters',
          confirm: 'Confirm Quote'
        },
        cancelModal: {
          title: 'Cancel Order',
          tip: 'Order {orderId} will be cancelled. This cannot be undone.',
          reasonPlaceholder: 'Cancel reason (required)',
          confirm: 'Confirm Cancel'
        },
        confirm: {
          retryArchive: 'Retry Archive',
          target: 'Order {orderId}'
        },
        success: {
          quoted: 'Quote submitted',
          cancelled: 'Order cancelled',
          retried: 'Archive retry triggered',
          downloaded: 'Source package downloaded'
        }
      },
      project: {
        title: 'Projects',
        detailTitle: 'Project Detail',
        projectId: 'Project ID',
        name: 'Project',
        owner: 'Owner',
        type: 'Type',
        status: 'Status',
        archived: 'Archived',
        archivedYes: 'Yes',
        archivedNo: 'No',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        detail: 'Detail',
        form: {
          createdRange: 'Created At',
          externalId: 'Account External ID',
          projectId: 'Project ID (exact)'
        },
        statusEnum: {
          all: 'All',
          inProgress: 'In Progress',
          archived: 'Archived'
        },
        drawer: {
          tabs: {
            basic: 'Basic Info',
            conversation: 'Conversation',
            prd: 'PRD',
            versions: 'Versions'
          },
          workspaceId: 'Workspace ID',
          prdProducedAt: 'PRD Produced At',
          generatedAt: 'First Generated At',
          activeOrder: 'Open Order',
          latestOrder: 'Latest Order',
          noActiveOrder: 'No open order',
          noOrder: 'No orders yet',
          costSummary: 'Cost Summary',
          costUnpriced: 'Unpriced usage exists (cost incomplete)',
          costComplete: 'Cost complete',
          answered: 'Answered',
          pendingAnswer: 'Pending',
          emptyConversation: 'No conversation records',
          prdUpdatedAt: 'PRD Updated At',
          prdEmpty: 'No PRD yet',
          versionCommit: 'Commit',
          versionSubject: 'Subject',
          versionRunId: 'Build Run',
          versionCommittedAt: 'Committed At',
          versionRollbackFrom: 'Rollback From',
          runNone: 'None (rollback)',
          versionEmpty: 'No versions yet',
          closingCard: 'Closing Card',
          closingMissing: 'Closing card missing (no payload this run)'
        }
      }
    }
  },
  form: {
    required: 'Cannot be empty',
    userName: {
      required: 'Please enter user name',
      invalid: 'User name format is incorrect'
    },
    phone: {
      required: 'Please enter phone number',
      invalid: 'Phone number format is incorrect'
    },
    pwd: {
      required: 'Please enter password',
      invalid: '6-18 characters, including letters, numbers, and underscores'
    },
    confirmPwd: {
      required: 'Please enter password again',
      invalid: 'The two passwords are inconsistent'
    },
    code: {
      required: 'Please enter verification code',
      invalid: 'Verification code format is incorrect'
    },
    email: {
      required: 'Please enter email',
      invalid: 'Email format is incorrect'
    }
  },
  dropdown: {
    closeCurrent: 'Close Current',
    closeOther: 'Close Other',
    closeLeft: 'Close Left',
    closeRight: 'Close Right',
    closeAll: 'Close All',
    pin: 'Pin Tab',
    unpin: 'Unpin Tab'
  },
  icon: {
    themeConfig: 'Theme Configuration',
    themeSchema: 'Theme Schema',
    lang: 'Switch Language',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit Fullscreen',
    reload: 'Reload Page',
    collapse: 'Collapse Menu',
    expand: 'Expand Menu',
    pin: 'Pin',
    unpin: 'Unpin'
  },
  datatable: {
    itemCount: 'Total {total} items',
    fixed: {
      left: 'Left Fixed',
      right: 'Right Fixed',
      unFixed: 'Unfixed'
    }
  }
};

export default local;
