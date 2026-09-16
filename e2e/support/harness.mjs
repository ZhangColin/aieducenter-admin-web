/**
 * E2E 公共 harness（#57 落地，六域共用 seam）——page.route mock + 断言汇总。
 *
 * mock 派生自 admin :8081 `/v3/api-docs`（fixtures 见各域 support/*-fixtures.mjs）；
 * 错误信封按 AiplatformUpstreamErrorAdvice 形状：HTTP 状态照抄 provider、
 * body.code＝provider 数字业务码（域码×1000＋序号）、message 原文。
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
 * 安装 /proxy-default/** 全量 mock（auth / menus.my / aiplatform.orders）。
 *
 * @param page playwright page
 * @param fixtures { ORDER_ROWS, ORDER_DETAILS, writeAck } 订单域 fixtures
 * @returns {{calls: Array, state: {failNextQuote: boolean}} calls=拦截到的请求流水（断言查询参数用）
 */
export async function installOrderMocks(page, fixtures) {
  const calls = [];
  const state = { failNextQuote: false };

  const json = (route, status, body) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  /** 订单列表 mock：四维筛选可组合（缺省＝全量），分页 1-based 切片回显。 */
  function listResponse(query) {
    let rows = [...fixtures.ORDER_ROWS];
    const status = query.get('status');
    if (status) {
      const codes = status.split(',').map(Number);
      rows = rows.filter(row => codes.includes(row.status));
    }
    const externalId = query.get('externalId');
    if (externalId) {
      // mock 语义：externalId 精确命中「下单账号拼音化 externalId」——fixtures 里映射到 ownerDisplayName 演示
      const ownerMap = { 'ext-wangshi2': '王十二', 'ext-zhaoliu': '赵六' };
      rows = rows.filter(row => row.ownerDisplayName === (ownerMap[externalId] ?? '@@none@@'));
    }
    const orderId = query.get('orderId');
    if (orderId) {
      rows = rows.filter(row => row.id === orderId);
    }
    const from = query.get('createdFrom');
    if (from) rows = rows.filter(row => row.createdAt >= from);
    const to = query.get('createdTo');
    if (to) rows = rows.filter(row => row.createdAt <= to);

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
            { code: 'admin:aiplatform:order:retry-archive', name: 'AI 平台 / 订单重试归档' }
          ],
          menus: []
        },
        requestId: 'e2e-mock',
        errors: null
      });
    }
    // ---- 动态菜单（镜像 V15 种子：AI 平台目录 + 订单叶子） ----
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
    if (path === '/aiplatform/orders' && method === 'GET') {
      return json(route, 200, listResponse(url.searchParams));
    }
    const orderMatch = path.match(/^\/aiplatform\/orders\/([^/]+)(\/(quote|cancel|retry-archive|source-package))?$/);
    if (orderMatch) {
      const [, id, , action] = orderMatch;

      if (!action && method === 'GET') {
        const detail = fixtures.ORDER_DETAILS[id];
        if (detail) return json(route, 200, { code: 200, message: 'ok', data: detail, requestId: 'e2e-mock', errors: null });
        return json(route, 404, { code: 5001, message: '订单不存在（ORD_001）', data: null, requestId: 'e2e-mock', errors: null });
      }
      if (action === 'quote' && method === 'POST') {
        if (state.failNextQuote) {
          state.failNextQuote = false;
          // AiplatformUpstreamErrorAdvice 形状：HTTP 409 + 数字业务码 5007（ORD_007）+ 原文 message
          return json(route, 409, { code: 5007, message: '订单已支付或已终结，无法报价（ORD_007）', data: null, requestId: 'e2e-mock', errors: null });
        }
        return json(route, 200, fixtures.writeAck(id));
      }
      if (action === 'cancel' && method === 'POST') {
        return json(route, 200, fixtures.writeAck(id));
      }
      if (action === 'retry-archive' && method === 'POST') {
        return json(route, 200, fixtures.writeAck(id));
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

    // 其余接口（本票范围外） benign 空成功，避免守卫/其他模块炸掉
    return json(route, 200, { code: 200, message: 'ok', data: null, requestId: 'e2e-mock', errors: null });
  });

  return { calls, state };
}
