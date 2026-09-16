/**
 * AI 平台成本中心 E2E（#61 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/cost-fixtures.mjs）。
 *
 * 覆盖验收（#61 七条）：时间窗必填（缺任一不发起请求 + 变更即重查）/ token 五档 stat tile 数值 /
 * byModel·byAgentKind 双柱状渲染（agentKindName null 落「—」桶——echarts tooltip DOM 锚定）/
 * unpriced 警示卡（有则高亮、窄窗避开即收起）/ 项目成本表（成本降序行序 + 分页 1-based）/
 * 行点击下钻抽屉（五档 + 双柱状 + 未配价档位复用）/ 「按币种成本」不渲染不报错（cost{} 空对象）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/cost.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as costFixtures from './support/cost-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
const RICH_PROJECT = '7392120209100200009'; // 教研备课知识库（富分解下钻目标）
const ZERO_PROJECT = '7392120209100500010'; // 校园社团招新小程序（零用量空态下钻目标）

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 成本域 GET 请求流水（按 path 全等匹配；停查/重查断言用）。 */
function costCalls(calls, path) {
  return calls.filter(c => c.method === 'GET' && c.path === path);
}

/** 最近一次成本请求的 query（URLSearchParams 解码后）。 */
function lastQuery(calls, path) {
  const call = costCalls(calls, path).at(-1);
  return new URLSearchParams(call?.query ?? '');
}

/** Naive datetimerange：fill 后 Tab 提交（Enter 不吃——订单域先例）。 */
async function fillRange(page, start, end) {
  const rangeInputs = page.locator('.n-date-picker input');
  await rangeInputs.nth(0).click();
  await rangeInputs.nth(0).fill(start);
  await rangeInputs.nth(0).press('Tab');
  await rangeInputs.nth(1).click();
  await rangeInputs.nth(1).fill(end);
  await rangeInputs.nth(1).press('Tab');
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-cost E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order，登录落订单页拉清单——
  // 不挂会撞 benign 空成功（data:null）炸 defaultTransform（pageerror 噪音，workspace E2E 同先例）
  const { calls } = await installAiplatformMocks(page, { order: orderFixtures, cost: costFixtures });

  /* ================= 1. 登录 → 侧栏「成本中心」菜单点亮 → 直达成本页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「成本中心」叶子', menuItemTexts.some(t => t.includes('成本中心')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/cost`);
  await sleep(800);

  /* ================= 2. 时间窗：初始默认窗（最近 30 天）四口齐查、UTC Instant 串 ================= */
  const overviewCalls = () => costCalls(calls, '/aiplatform/costs/overview');
  const unpricedCalls = () => costCalls(calls, '/aiplatform/costs/unpriced');
  const listCalls = () => costCalls(calls, '/aiplatform/costs/projects');
  const detailCalls = () => calls.filter(c => c.method === 'GET' && /^\/aiplatform\/costs\/projects\/[^/]+$/.test(c.path));
  h.check('初始总览请求 1 次（变更前不重查）', overviewCalls().length === 1, `实际 ${overviewCalls().length}`);
  h.check('初始 unpriced/项目清单各 1 次', unpricedCalls().length === 1 && listCalls().length === 1);
  let q = lastQuery(calls, '/aiplatform/costs/overview');
  const from = q.get('from');
  const to = q.get('to');
  h.check(
    'from/to 均为 UTC Instant 串（带 Z、秒精度、from<to）',
    Boolean(from && to && from.endsWith('Z') && to.endsWith('Z') && from < to),
    `${from} ~ ${to}`
  );
  h.check('默认窗约最近 30 天（29~31 天跨度）', to && from ? (new Date(to) - new Date(from)) / 86_400_000 > 28 && (new Date(to) - new Date(from)) / 86_400_000 < 32 : false);
  h.check('项目清单同窗 + page=1&size=10（1-based 直传）', (() => { const lq = lastQuery(calls, '/aiplatform/costs/projects'); return lq.get('from') === from && lq.get('page') === '1' && lq.get('size') === '10'; })(), lastQuery(calls, '/aiplatform/costs/projects').toString());

  /* ================= 3. token 五档 stat tile（primitive long 数字千分位） ================= */
  const overviewCard = page.locator('.n-card').filter({ hasText: '平台 token 用量总览' }).first();
  await overviewCard.getByText('1,234,567').waitFor({ timeout: 10000 });
  h.check('五档 tile 数值（输入 1,234,567 / 输出 987,654）', (await overviewCard.getByText('1,234,567').count()) > 0 && (await overviewCard.getByText('987,654').count()) > 0);
  h.check('五档 tile 数值（缓存读 456,789 / 缓存写 123,456 / 推理 234,567）', (await overviewCard.getByText('456,789').count()) > 0 && (await overviewCard.getByText('123,456').count()) > 0 && (await overviewCard.getByText('234,567').count()) > 0);
  h.check('五档档位名渲染（缓存读/缓存写/推理）', (await overviewCard.getByText('缓存读', { exact: true }).count()) > 0 && (await overviewCard.getByText('推理', { exact: true }).count()) > 0);

  /* ================= 4. 双柱状：两卡渲染 canvas；byAgentKind null 落「—」桶（tooltip 锚定） ================= */
  const modelCard = page.locator('.n-card').filter({ hasText: '按模型分解' }).first();
  const agentCard = page.locator('.n-card').filter({ hasText: '按智能体分解' }).first();
  h.check('byModel 卡渲染 canvas', (await modelCard.locator('canvas').count()) > 0);
  h.check('byAgentKind 卡渲染 canvas', (await agentCard.locator('canvas').count()) > 0);
  // echarts tooltip 默认 html 渲染：hover 第三柱区（internal-review，agentKindName=null 落「—」桶）
  const canvasBox = await agentCard.locator('canvas').boundingBox();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.78, canvasBox.y + canvasBox.height * 0.5);
  await sleep(800);
  const agentTooltipText = (await agentCard.locator('div', { hasText: '—' }).allTextContents()).join(' ');
  h.check('byAgentKind null 辅助标记落「—」桶（tooltip 文本）', agentTooltipText.includes('—') && agentTooltipText.length > 0, agentTooltipText.slice(0, 80));
  await page.mouse.move(10, 10);
  await sleep(300);

  /* ================= 5. unpriced 警示卡：默认窗（覆盖 2026-09-10）高亮 ================= */
  const alertBox = page.locator('.n-alert');
  await alertBox.getByText('未配价用量警示').waitFor({ timeout: 10000 });
  h.check('unpriced 卡高亮渲染（warning）', (await alertBox.count()) > 0);
  h.check('unpriced 行（provider/model/档位名/无价 tokens）', (await alertBox.getByText('claude-opus-5').count()) > 0 && (await alertBox.getByText('输出', { exact: true }).count()) > 0 && (await alertBox.getByText('88,000').count()) > 0 && (await alertBox.getByText('推理', { exact: true }).count()) > 0);

  /* ================= 6. 项目成本表：行序（成本降序 fixtures 序）+ 五档列 + 全未配价标注 ================= */
  await page.locator(ROW).first().waitFor({ timeout: 10000 });
  h.check('清单首屏 10 行（size=10，共 12 条）', (await page.locator(ROW).count()) === 10, `实际 ${await page.locator(ROW).count()} 行`);
  const firstRow = page.locator(ROW).first();
  h.check('首行=成本最高项目（教研备课知识库 TSID）', (await firstRow.getByText(RICH_PROJECT).count()) > 0);
  h.check('行五档数值（600,000 / 500,000）', (await firstRow.getByText('600,000').count()) > 0 && (await firstRow.getByText('500,000').count()) > 0);
  h.check('已配价行标注', (await firstRow.getByText('已配价').count()) > 0);

  /* ================= 7. 分页：翻第 2 页 → page=2（1-based）；全未配价行排后 ================= */
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  h.check('翻第 2 页请求 page=2（零 ±1）', lastQuery(calls, '/aiplatform/costs/projects').get('page') === '2', lastQuery(calls, '/aiplatform/costs/projects').toString());
  const page2Rows = page.locator(ROW);
  h.check('第 2 页 2 行（共 12 条）', (await page2Rows.count()) === 2);
  h.check('全未配价行排后 + allUnpriced 标注（末行）', (await page2Rows.last().getByText('全未配价').count()) > 0 && (await page2Rows.last().getByText('7392120209089500001').count()) > 0);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  /* ================= 8. 行点击下钻：五档 + 双柱状 + 未配价档位（复用组件） ================= */
  const callsBeforeDetail = detailCalls().length;
  await firstRow.click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('项目成本下钻').waitFor({ timeout: 10000 });
  // 抽屉数据异步到达——先锚定数据驱动元素再断言（title/props 即渲染、五档 tile 等响应）
  await drawer.getByText('500,000').waitFor({ timeout: 10000 });
  h.check('下钻 GET /costs/projects/{id}（同窗直查）', detailCalls().length === callsBeforeDetail + 1 && detailCalls().at(-1)?.query.includes('from='));
  h.check('抽屉项目 ID + 窗口回显', (await drawer.getByText(RICH_PROJECT).count()) > 0 && (await drawer.getByText('~').count()) > 0);
  h.check('抽屉五档 tile（500,000 / 420,000）', (await drawer.getByText('500,000').count()) > 0 && (await drawer.getByText('420,000').count()) > 0);
  // canvas 初始化在数据后一拍（ResizeObserver→echarts init）——锚定第二张 canvas 再计数
  await drawer.locator('canvas').nth(1).waitFor({ timeout: 10000 });
  h.check('抽屉双柱状渲染（两 canvas）', (await drawer.locator('canvas').count()) === 2);
  h.check('抽屉未配价档位 tag（anthropic/claude-opus-5 + 档位名；无 tokens 列）', (await drawer.getByText('anthropic/claude-opus-5').count()) > 0 && (await drawer.locator('.n-tag', { hasText: '推理' }).count()) > 0);
  h.check('抽屉不渲染「按币种成本」区块（REQ-20 留位）', (await drawer.getByText('按币种').count()) === 0);

  /* ================= 9. 零用量项目下钻：全零 total + 空结构（明确空态非 404） ================= */
  await page.keyboard.press('Escape');
  await sleep(600);
  await page.locator(ROW).filter({ hasText: ZERO_PROJECT }).click();
  const zeroDrawer = page.locator('.n-drawer');
  await zeroDrawer.getByText('项目成本下钻').waitFor({ timeout: 10000 });
  await zeroDrawer.getByText('成本构成完整（无未配价档位）').waitFor({ timeout: 10000 });
  h.check('零用量下钻：五档 0 tile', (await zeroDrawer.getByText('0', { exact: true }).count()) > 0);
  h.check('零用量下钻：未配价空态文案 + 双柱状空态', (await zeroDrawer.getByText('成本构成完整（无未配价档位）').count()) > 0 && (await zeroDrawer.getByText('暂无数据').count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);

  /* ================= 10. 变更即重查：窄窗避开未配价事件 → 四口重查 + unpriced 收起 ================= */
  const overviewBefore = overviewCalls().length;
  const unpricedBefore = unpricedCalls().length;
  const listBefore = listCalls().length;
  await fillRange(page, '2026-09-14 00:00:00', '2026-09-15 00:00:00');
  await sleep(1000);
  // Naive datetimerange fill+Tab 两次提交：首 Tab 即变更（新起+旧讫）→ 可能 +2 次——断言 ≥+1（每次变更必重查）
  h.check(
    '变更即重查：总览/unpriced/清单均重查（≥+1）',
    overviewCalls().length >= overviewBefore + 1 && unpricedCalls().length >= unpricedBefore + 1 && listCalls().length >= listBefore + 1,
    `${overviewCalls().length - overviewBefore}/${unpricedCalls().length - unpricedBefore}/${listCalls().length - listBefore}`
  );
  q = lastQuery(calls, '/aiplatform/costs/overview');
  // 本地 2026-09-14 00:00 → UTC 前移时区偏移（CI 机 Asia/Shanghai = -8h：2026-09-13T16:00:00Z）
  const expectedFrom = new Date('2026-09-14T00:00:00').toISOString().slice(0, 19) + 'Z';
  h.check('窄窗 from 按本地→UTC 折算提交', q.get('from') === expectedFrom, `${q.get('from')} ≠ ${expectedFrom}`);
  h.check('窄窗避开未配价事件 → unpriced 卡收起', (await page.locator('.n-alert').count()) === 0, `alert 数 ${await page.locator('.n-alert').count()}`);

  /* ================= 11. 清空时间窗：缺任一不发起请求 + 整页提示态 ================= */
  const allCostBefore = calls.filter(c => c.path.startsWith('/aiplatform/costs')).length;
  await page.locator('.n-date-picker').hover();
  await page.locator('.n-date-picker .n-base-clear').click();
  await sleep(800);
  h.check('清空后不再发起成本请求（缺任一不发起）', calls.filter(c => c.path.startsWith('/aiplatform/costs')).length === allCostBefore, `${allCostBefore} → ${calls.filter(c => c.path.startsWith('/aiplatform/costs')).length}`);
  h.check('清空后整页提示态（请选择时间窗）', (await page.getByText('请选择时间窗后查询').count()) > 0);
  h.check('清空后四段不渲染（无表格/图表卡）', (await page.locator(ROW).count()) === 0 && (await page.locator('canvas').count()) === 0);

  /* ================= 12. 重选窗口恢复查询（宽窗覆盖事件 → unpriced 卡回归） ================= */
  await fillRange(page, '2026-09-01 00:00:00', '2026-09-16 00:00:00');
  await sleep(1000);
  h.check('重选窗口恢复查询（总览再查）', overviewCalls().length > overviewBefore + 1);
  await page.locator('.n-alert').getByText('未配价用量警示').waitFor({ timeout: 10000 });
  h.check('宽窗覆盖未配价事件 → 警示卡回归', (await page.locator('.n-alert').getByText('claude-opus-5').count()) > 0);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-cost E2E');
  });
