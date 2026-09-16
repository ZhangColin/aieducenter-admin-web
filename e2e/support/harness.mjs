/**
 * E2E 公共 harness（#57 落地、#58 泛化，六域共用 seam）——page.route mock + 断言汇总。
 *
 * mock 派生自 admin :8081 `/v3/api-docs`（fixtures 见各域 support/*-fixtures.mjs）；
 * 错误信封按 AiplatformUpstreamErrorAdvice 形状：HTTP 状态照抄 provider、
 * body.code＝provider 数字业务码（域码×1000＋序号：PRJ→4xxx / ORD→5xxx）、message 原文。
 */
import zlib from 'node:zlib';

/** 断言台账：PASS/FAIL 汇总，exit code 收口。 */
export function createHarness() {
  const results = [];
  return {
    /** @param name 断言名 @param cond 真值 @param detail 失败时的上下文 */
    check(name, cond, detail = '') {
      results.push({ name, pass: Boolean(cond), detail: cond ? '' : detail });
      const mark = cond ? 'PASS' : 'FAIL';
      console.log(`  [${mark}] ${name}${cond ? '' : ` —— ${detail}`}`);
    },
    summary(label) {
      const failed = results.filter(r => !r.pass);
      console.log(`\n${label}: ${results.length - failed.length}/${results.length} 通过`);
      if (failed.length) {
        process.exitCode = 1;
      }
      return failed.length === 0;
    }
  };
}

/** 延迟：Naive UI 动画/请求节流需要真实等待。 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 轮询抓 toast 闪现（Naive message 生命周期 ~3s，单点 isVisible/waitFor 易错过）。
 * @param page playwright page
 * @param predicate 命中函数（收到消息文本数组）
 * @param timeoutMs 最长等待（默认 10s，300ms 步进）
 * @returns 命中的消息数组；未命中返回 null
 */
export async function waitForMessage(page, predicate, timeoutMs = 10000) {
  const steps = Math.ceil(timeoutMs / 300);
  for (let i = 0; i < steps; i += 1) {
    await sleep(300);
    const msgs = await page.locator('.n-message').allTextContents();
    if (msgs.length && predicate(msgs)) return msgs;
  }
  const last = await page.locator('.n-message').allTextContents();
  return last.length && predicate(last) ? last : null;
}

/**
 * 安装 /proxy-default/** 全量 mock（auth / menus.my / aiplatform 各域）。
 *
 * @param page playwright page
 * @param fixtures { order?, project? } 各域 fixtures（见 support/*-fixtures.mjs；域缺省＝不挂该域路由）
 * @returns {{calls: Array, state: {failNextQuote: boolean}} calls=拦截到的请求流水（断言查询参数用）
 */
export async function installAiplatformMocks(page, fixtures) {
  const calls = [];
  const state = { failNextQuote: false };

  const json = (route, status, body) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  /** 时间区间过滤（含两端，字符串比较即可——fixtures/查询均为 ISO-8601 同形本地串）。 */
  function filterByCreatedRange(rows, query) {
    const from = query.get('createdFrom');
    const to = query.get('createdTo');
    let out = rows;
    if (from) out = out.filter(row => row.createdAt >= from);
    if (to) out = out.filter(row => row.createdAt <= to);
    return out;
  }

  /** externalId 精确 → ownerDisplayName 映射（两域 fixtures 共用同一批账号档案）。 */
  const externalIdOwnerMap = { 'ext-wangshi2': '王十二', 'ext-zhaoliu': '赵六' };
  function filterByExternalId(rows, query) {
    const externalId = query.get('externalId');
    if (!externalId) return rows;
    return rows.filter(row => row.ownerDisplayName === (externalIdOwnerMap[externalId] ?? '@@none@@'));
  }

  /** 分页切片（1-based，镜像 PageResponse wire：total 为字符串）。 */
  function paginate(rows, query) {
    const pageNum = Math.max(1, Number(query.get('page') ?? '1'));
    const size = Math.max(1, Number(query.get('size') ?? '10'));
    return {
      code: 200,
      message: 'ok',
      data: {
        items: rows.slice((pageNum - 1) * size, pageNum * size),
        total: String(rows.length),
        page: pageNum,
        size
      },
      requestId: 'e2e-mock',
      errors: null
    };
  }

  /** 订单列表 mock：四维筛选可组合（缺省＝全量），分页 1-based 切片回显。 */
  function orderListResponse(query) {
    let rows = [...fixtures.order.ORDER_ROWS];
    const status = query.get('status');
    if (status) {
      const codes = status.split(',').map(Number);
      rows = rows.filter(row => codes.includes(row.status));
    }
    rows = filterByExternalId(rows, query);
    const orderId = query.get('orderId');
    if (orderId) {
      rows = rows.filter(row => row.id === orderId);
    }
    rows = filterByCreatedRange(rows, query);
    return paginate(rows, query);
  }

  /** 项目列表 mock：四维筛选（status 三档单值——与订单多选逗号串有意不同），归档照读不特殊处理。 */
  function projectListResponse(query) {
    let rows = [...fixtures.project.PROJECT_ROWS];
    const status = query.get('status');
    if (status) {
      rows = rows.filter(row => row.status === Number(status));
    }
    rows = filterByExternalId(rows, query);
    const projectId = query.get('projectId');
    if (projectId) {
      rows = rows.filter(row => row.id === projectId);
    }
    rows = filterByCreatedRange(rows, query);
    return paginate(rows, query);
  }

  await page.route('**/proxy-default/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/proxy-default', '');
    const method = route.request().method();
    calls.push({ method, path, query: url.search, body: route.request().postData() });

    // ---- 认证 ----
    if (path === '/auth/login' && method === 'POST') {
      return json(route, 200, {
        code: 200,
        message: 'ok',
        data: { token: 'e2e-mock-token', loginId: '1', expireTime: Date.now() + 86_400_000 },
        requestId: 'e2e-mock',
        errors: null
      });
    }
    if (path === '/auth/current' && method === 'GET') {
      return json(route, 200, {
        code: 200,
        message: 'ok',
        data: {
          user: { id: '1', username: 'admin', nickname: 'E2E Mock', email: null, phone: null, avatar: null },
          roleCodes: ['SUPER_ADMIN'],
          permissions: [
            { code: 'admin:aiplatform:order:read', name: 'AI 平台 / 订单查看' },
            { code: 'admin:aiplatform:order:quote', name: 'AI 平台 / 订单报价' },
            { code: 'admin:aiplatform:order:cancel', name: 'AI 平台 / 订单取消' },
            { code: 'admin:aiplatform:order:retry-archive', name: 'AI 平台 / 订单重试归档' },
            { code: 'admin:aiplatform:project:read', name: 'AI 平台 / 项目查看' }
          ],
          menus: []
        },
        requestId: 'e2e-mock',
        errors: null
      });
    }
    // ---- 动态菜单（镜像 V15 种子：AI 平台目录 + 订单/项目叶子） ----
    if (path === '/menus/my' && method === 'GET') {
      return json(route, 200, {
        code: 200,
        message: 'ok',
        data: {
          home: 'aiplatform_order',
          menus: [
            {
              id: '82',
              menuName: 'AI 平台',
              routeName: 'aiplatform',
              routePath: '/aiplatform',
              component: 'layout.base',
              icon: 'carbon:machine-learning-model',
              iconType: 1,
              i18nKey: 'route.aiplatform',
              parentId: null,
              sortOrder: 3,
              menuType: 1,
              status: 1,
              children: [
                {
                  id: '160',
                  menuName: '订单管理',
                  routeName: 'aiplatform_order',
                  routePath: '/aiplatform/order',
                  component: 'view.aiplatform_order',
                  icon: 'carbon:shopping-cart',
                  iconType: 1,
                  i18nKey: 'route.aiplatform_order',
                  parentId: '82',
                  sortOrder: 1,
                  menuType: 2,
                  status: 1
                },
                {
                  id: '161',
                  menuName: '项目管理',
                  routeName: 'aiplatform_project',
                  routePath: '/aiplatform/project',
                  component: 'view.aiplatform_project',
                  icon: 'carbon:catalog',
                  iconType: 1,
                  i18nKey: 'route.aiplatform_project',
                  parentId: '82',
                  sortOrder: 2,
                  menuType: 2,
                  status: 1
                }
              ]
            }
          ]
        },
        requestId: 'e2e-mock',
        errors: null
      });
    }

    // ---- 订单域 ----
    if (fixtures.order && path === '/aiplatform/orders' && method === 'GET') {
      return json(route, 200, orderListResponse(url.searchParams));
    }
    if (fixtures.order) {
      const orderMatch = path.match(/^\/aiplatform\/orders\/([^/]+)(\/(quote|cancel|retry-archive|source-package))?$/);
      if (orderMatch) {
        const [, id, , action] = orderMatch;

        if (!action && method === 'GET') {
          const detail = fixtures.order.ORDER_DETAILS[id];
          if (detail) return json(route, 200, { code: 200, message: 'ok', data: detail, requestId: 'e2e-mock', errors: null });
          return json(route, 404, { code: 5001, message: '订单不存在（ORD_001）', data: null, requestId: 'e2e-mock', errors: null });
        }
        if (action === 'quote' && method === 'POST') {
          if (state.failNextQuote) {
            state.failNextQuote = false;
            // AiplatformUpstreamErrorAdvice 形状：HTTP 409 + 数字业务码 5007（ORD_007）+ 原文 message
            return json(route, 409, { code: 5007, message: '订单已支付或已终结，无法报价（ORD_007）', data: null, requestId: 'e2e-mock', errors: null });
          }
          return json(route, 200, fixtures.order.writeAck(id));
        }
        if (action === 'cancel' && method === 'POST') {
          return json(route, 200, fixtures.order.writeAck(id));
        }
        if (action === 'retry-archive' && method === 'POST') {
          return json(route, 200, fixtures.order.writeAck(id));
        }
        if (action === 'source-package' && method === 'GET') {
          const gzip = zlib.gzipSync(`e2e-mock-source-package-for-${id}`);
          return route.fulfill({
            status: 200,
            headers: {
              'content-type': 'application/gzip',
              'content-disposition': `attachment; filename="${id}-source.tar.gz"`
            },
            body: gzip
          });
        }
      }
    }

    // ---- 项目域 ----
    if (fixtures.project && path === '/aiplatform/projects' && method === 'GET') {
      return json(route, 200, projectListResponse(url.searchParams));
    }
    if (fixtures.project) {
      const versionMatch = path.match(/^\/aiplatform\/projects\/([^/]+)\/versions\/([^/]+)$/);
      if (versionMatch && method === 'GET') {
        const [, id, ref] = versionMatch;
        const detail = fixtures.project.VERSION_DETAILS[`${id}:${ref}`];
        if (detail) return json(route, 200, { code: 200, message: 'ok', data: detail, requestId: 'e2e-mock', errors: null });
        return json(route, 404, { code: 4028, message: '版本不存在（PRJ_028）', data: null, requestId: 'e2e-mock', errors: null });
      }
      const projectMatch = path.match(/^\/aiplatform\/projects\/([^/]+)(\/(conversation|prd|versions))?$/);
      if (projectMatch) {
        const [, id, , action] = projectMatch;

        if (!action && method === 'GET') {
          const detail = fixtures.project.PROJECT_DETAILS[id];
          if (detail) return json(route, 200, { code: 200, message: 'ok', data: detail, requestId: 'e2e-mock', errors: null });
          return json(route, 404, { code: 4001, message: '项目不存在（PRJ_001）', data: null, requestId: 'e2e-mock', errors: null });
        }
        if (action === 'conversation' && method === 'GET') {
          const entries = fixtures.project.CONVERSATIONS[id] ?? [];
          return json(route, 200, { code: 200, message: 'ok', data: entries, requestId: 'e2e-mock', errors: null });
        }
        if (action === 'prd' && method === 'GET') {
          const prd = fixtures.project.PRDS[id];
          if (prd) return json(route, 200, { code: 200, message: 'ok', data: prd, requestId: 'e2e-mock', errors: null });
          // PRD 未产出口径（工作区无 docs/PRD.md）——区别于项目不存在的 PRJ_001
          return json(route, 404, { code: 4015, message: 'PRD 尚未产出（PRJ_015）', data: null, requestId: 'e2e-mock', errors: null });
        }
        if (action === 'versions' && method === 'GET') {
          const versions = fixtures.project.VERSIONS[id] ?? [];
          return json(route, 200, { code: 200, message: 'ok', data: versions, requestId: 'e2e-mock', errors: null });
        }
      }
    }

    // 其余接口（本票范围外）benign 空成功，避免守卫/其他模块炸掉
    return json(route, 200, { code: 200, message: 'ok', data: null, requestId: 'e2e-mock', errors: null });
  });

  return { calls, state };
}
