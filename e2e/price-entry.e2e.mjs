/**
 * AI 平台单价表域 E2E（#62 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/price-entry-fixtures.mjs）。
 *
 * 覆盖验收（#62 六条）：清单渲染契约字段（含历史行 + operator 两列 + 微小价位原串）/
 * provider·model 精确过滤、分页 1-based / 原子改价（预填原串 REQ-20 口径 + unitPrice 提交转 number +
 * effectiveFrom ISO Instant UTC 带 Z + 回执 closed/opened 两行呈现 + 成功后刷新——新行入清单首行）/
 * 停用（即时）触发正确端点 + 行关死 / 失败透传 provider message 统一 toast（409 METER_008）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/price-entry.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as priceEntryFixtures from './support/price-entry-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
/** 改价主目标：deepseek-v4-flash 输出（当前行，种子操作者 null）。 */
const REPRICE_ID = '357701022659621666';
/** 停用目标：qwen4-max 输出（当前行，CNY）。 */
const DEACTIVATE_ID = '357701019688000015';
/** 改价回执新开行 id（harness 固定产出）。 */
const OPENED_ID = priceEntryFixtures.OPENED_ROW_ID;

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里最后一条单价清单请求（筛选/分页断言用）。 */
function lastListCall(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/price-entries').at(-1);
}

/** ISO Instant（UTC 带 Z）→ 本地时区 'YYYY-MM-DD HH:mm:ss'（镜像页侧 formatDateTime 折算）。 */
const pad = n => String(n).padStart(2, '0');
function localFmt(instant) {
  const d = new Date(instant);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** NDatePicker datetime 键盘输入：fill 后 Tab 提交（Enter 不吃——成本域先例）。 */
async function fillDateTime(page, text) {
  const input = page.locator('.n-modal .n-date-picker input');
  await input.fill(text);
  await input.press('Tab');
  await sleep(200);
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-price-entry E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，四域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, priceEntry: priceEntryFixtures });

  /* ================= 1. 登录 → 侧栏「单价表」菜单点亮 → 直达单价表页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「单价表」叶子', menuItemTexts.some(t => t.includes('单价表')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/price-entry`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/price-entry 且列表渲染', page.url().includes('/aiplatform/price-entry'));

  /* ================= 2. 清单渲染契约字段（含历史行 + operator 两列 + 微小价位原串） ================= */
  h.check('列表首屏渲染 10 行（size=10）', (await page.locator(ROW).count()) === 10);
  const listCall = lastListCall(calls);
  h.check(
    '初始请求 page=1&size=10、无过滤参数（1-based 直传）',
    listCall?.query.includes('page=1') && listCall?.query.includes('size=10') && !listCall?.query.includes('provider') && !listCall?.query.includes('model'),
    listCall?.query
  );
  // 首行 = 已关历史行（生效起点倒序）：全契约字段 + 陈运营操作者两列 + 无写操作
  const historyRow = page.locator(ROW).first();
  h.check('历史行：id/provider/model 渲染', (await historyRow.getByText('357701031200000101').count()) > 0 && (await historyRow.getByText('deepseek', { exact: true }).count()) > 0 && (await historyRow.getByText('deepseek-v4-flash').count()) > 0);
  h.check('历史行：tokenKindName 直读（输入）+ 单价原串 + 币种', (await historyRow.getByText('输入', { exact: true }).count()) > 0 && (await historyRow.getByText('0.00000050', { exact: true }).count()) > 0 && (await historyRow.getByText('USD', { exact: true }).count()) > 0);
  h.check(
    '历史行：生效区间两列（本地折算）',
    (await historyRow.getByText(localFmt('2026-06-01T16:00:00Z')).count()) > 0 && (await historyRow.getByText(localFmt('2026-09-01T16:00:00Z')).count()) > 0
  );
  h.check('历史行：operator 两列（陈运营 + id）', (await historyRow.getByText('陈运营').count()) > 0 && (await historyRow.getByText('3', { exact: true }).count()) > 0);
  h.check('历史行：无改价/停用（METER_007 不可达不出现）', (await historyRow.getByRole('button').count()) === 0);
  // 当前行：「当前」tag + 种子行操作者 '-' + 两写按钮
  const currentRow = page.locator(ROW).filter({ hasText: REPRICE_ID });
  h.check('当前行：effectiveTo 列「当前」tag', (await currentRow.locator('.n-tag', { hasText: '当前' }).count()) > 0);
  h.check('当前行：种子行操作者占位（-）', (await currentRow.getByText('-', { exact: true }).count()) > 0);
  h.check('当前行：改价 + 停用两按钮', (await currentRow.getByRole('button', { name: /改\s*价/ }).count()) > 0 && (await currentRow.getByRole('button', { name: /停\s*用/ }).count()) > 0);
  // 微小价位原串渲染（勿经 Number() 往返落科学计数法形）
  const tinyRow = page.locator(ROW).filter({ hasText: '357701022362578014' });
  h.check('微小价位原串渲染（0.000000014）', (await tinyRow.getByText('0.000000014', { exact: true }).count()) > 0);
  h.check('档位名直读（缓存读）', (await page.locator(ROW).getByText('缓存读', { exact: true }).count()) > 0);

  /* ================= 3. provider/model 过滤（精确等值）+ 重置 ================= */
  await page.getByPlaceholder('精确匹配，如 deepseek', { exact: true }).fill('anthropic');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  let q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('provider 过滤绑定 provider=anthropic', q.get('provider') === 'anthropic' && q.get('model') === null, lastListCall(calls)?.query);
  h.check('provider 过滤命中 3 行（claude-sonnet-5 三档）', (await page.locator(ROW).count()) === 3, `实际 ${await page.locator(ROW).count()} 行`);

  await page.getByPlaceholder('精确匹配，如 deepseek', { exact: true }).fill('deepseek');
  await page.getByPlaceholder('精确匹配，如 deepseek-v4-flash').fill('deepseek-v4-flash');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('组合过滤绑定 provider=deepseek&model=deepseek-v4-flash', q.get('provider') === 'deepseek' && q.get('model') === 'deepseek-v4-flash', lastListCall(calls)?.query);
  h.check('组合过滤命中 4 行（三档现行 + 输入历史行）', (await page.locator(ROW).count()) === 4, `实际 ${await page.locator(ROW).count()} 行`);

  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('重置后请求不带过滤参数', q.get('provider') === null && q.get('model') === null, lastListCall(calls)?.query);

  /* ================= 4. 分页：翻第 2 页 → page=2（1-based）+ CNY 行 ================= */
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  h.check('翻第 2 页请求 page=2（零 ±1）', lastListCall(calls)?.query.includes('page=2'), lastListCall(calls)?.query);
  h.check('第 2 页渲染 2 行（共 12 条）', (await page.locator(ROW).count()) === 2);
  const qwenRow = page.locator(ROW).filter({ hasText: DEACTIVATE_ID });
  h.check('CNY 行渲染（0.000012 + CNY，第 2 页）', (await qwenRow.getByText('0.000012', { exact: true }).count()) > 0 && (await qwenRow.getByText('CNY', { exact: true }).count()) > 0);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  /* ================= 5. 改价失败链：409 METER_008 透传 toast、弹窗保持表单态 ================= */
  state.failNextReprice = true;
  await page.locator(ROW).filter({ hasText: REPRICE_ID }).getByRole('button', { name: /改\s*价/ }).click();
  const modal = page.locator('.n-modal');
  await modal.getByText('原子改价').first().waitFor({ timeout: 5000 });
  // 预填：unitPrice 响应原串直灌（REQ-20——string 原样，勿转 number 落形变）+ currency 随行
  const prefillPrice = await modal.getByPlaceholder('明文小数，如 0.00000132').inputValue();
  const prefillCurrency = await modal.getByPlaceholder('币种（ISO 4217）').inputValue();
  h.check('预填 unitPrice 响应原串（0.00000132）', prefillPrice === '0.00000132', prefillPrice);
  h.check('预填 currency（USD）', prefillCurrency === 'USD', prefillCurrency);
  await modal.getByPlaceholder('明文小数，如 0.00000132').fill('0.0000025');
  await fillDateTime(page, '2026-10-01 00:00:00');
  await modal.getByRole('button', { name: /确认改价/ }).click();
  const failToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('METER_008')));
  h.check('改价失败 toast 透传 provider message（METER_008）', Boolean(failToast), JSON.stringify(failToast));
  h.check('失败后弹窗保持表单态（可修正重试）', (await modal.getByText('原子改价').count()) > 0 && (await modal.getByText('改价回执').count()) === 0);
  await modal.getByRole('button', { name: /取\s*消/ }).click();
  await sleep(400);

  /* ================= 6. 原子改价成功链：预发布字段 + string→number + 回执两行 + 刷新 ================= */
  const repriceCallsBefore = calls.filter(c => c.method === 'POST' && c.path === `/aiplatform/price-entries/${REPRICE_ID}/reprice`).length;
  const listGetsBefore = calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/price-entries').length;
  await page.locator(ROW).filter({ hasText: REPRICE_ID }).getByRole('button', { name: /改\s*价/ }).click();
  await modal.getByText('原子改价').first().waitFor({ timeout: 5000 });
  await modal.getByPlaceholder('明文小数，如 0.00000132').fill('0.0000025');
  await fillDateTime(page, '2026-10-01 00:00:00');
  await modal.getByRole('button', { name: /确认改价/ }).click();

  // 请求侧断言：unitPrice JSON **number**（REQ-20 入参口径）、effectiveFrom 本地→UTC Instant 带 Z
  const repriceCall = calls.filter(c => c.method === 'POST' && c.path === `/aiplatform/price-entries/${REPRICE_ID}/reprice`).at(-1);
  const body = repriceCall?.body ? JSON.parse(repriceCall.body) : null;
  const expectedFrom = `${new Date('2026-10-01T00:00:00').toISOString().slice(0, 19)}Z`;
  h.check('POST reprice 端点命中（一次成功请求）', repriceCall !== undefined && calls.filter(c => c.method === 'POST' && c.path === `/aiplatform/price-entries/${REPRICE_ID}/reprice`).length === repriceCallsBefore + 1);
  h.check('unitPrice 提交为 JSON number（string→number 预填转类型）', typeof body?.unitPrice === 'number' && body?.unitPrice === 0.0000025, repriceCall?.body);
  h.check('effectiveFrom ISO-8601 Instant UTC 带 Z（本地折算）', body?.effectiveFrom === expectedFrom, `${body?.effectiveFrom} ≠ ${expectedFrom}`);
  h.check('currency 随命令体透传', body?.currency === 'USD');

  // 回执视图：closed/opened 两行呈现（同事务库内事实）
  await modal.getByText('改价回执').first().waitFor({ timeout: 5000 });
  const closedBlock = modal.locator('.mb-8px').filter({ hasText: '已关行' });
  const openedBlock = modal.locator('.mb-8px').filter({ hasText: '新开行' });
  h.check('回执 closed/opened 两行呈现', (await closedBlock.count()) === 1 && (await openedBlock.count()) === 1);
  h.check('已关行：原价 + 止点=新起点（本地折算）', (await closedBlock.getByText('0.00000132 USD').count()) > 0 && (await closedBlock.getByText(localFmt(expectedFrom)).count()) > 0);
  h.check('新开行：新价 + 敞口生效中 + 操作者落痕', (await openedBlock.getByText('0.0000025 USD').count()) > 0 && (await openedBlock.getByText('敞口生效中').count()) > 0 && (await openedBlock.getByText('E2E Mock').count()) > 0);
  const repricedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('改价成功')));
  h.check('改价成功 toast', Boolean(repricedToast));
  await sleep(600);
  h.check('改价后列表刷新', calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/price-entries').length > listGetsBefore);
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(600);

  // 刷新后清单：新行入首行（当前行 + 操作者）+ 原行关死（止点=新起点、无写操作）
  const newRow = page.locator(ROW).first();
  h.check('刷新后新开行入清单首行（id + 当前 tag + 操作者）', (await newRow.getByText(OPENED_ID).count()) > 0 && (await newRow.locator('.n-tag', { hasText: '当前' }).count()) > 0 && (await newRow.getByText('E2E Mock').count()) > 0);
  const closedListRow = page.locator(ROW).filter({ hasText: REPRICE_ID });
  h.check('原行关死：effectiveTo=新起点（本地折算）', (await closedListRow.getByText(localFmt(expectedFrom)).count()) > 0);
  h.check('原行关死：无改价/停用按钮', (await closedListRow.getByRole('button').count()) === 0);

  /* ================= 7. 停用（即时生效）：正确端点 + 行关死 + 刷新 ================= */
  // qwen 行在第 2 页（13 条 @size10）
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  const deactivatRow = page.locator(ROW).filter({ hasText: DEACTIVATE_ID });
  await deactivatRow.getByRole('button', { name: /停\s*用/ }).click();
  const dialog = page.locator('.n-dialog');
  await dialog.getByText('停用单价行').waitFor({ timeout: 5000 });
  h.check('停用确认框：目标对账（qwen / qwen4-max · 输出）', (await dialog.getByText('qwen / qwen4-max · 输出').count()) > 0);
  h.check('停用确认框：即时关行提示', (await dialog.getByText('未配价警示').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const deactivatedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已停用')));
  h.check('停用成功 toast + POST deactivate 端点', Boolean(deactivatedToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/price-entries/${DEACTIVATE_ID}/deactivate`));
  await sleep(600);
  // 刷新后行关死：effectiveTo=停用时刻（本地折算）+ 操作者落痕 + 无写操作
  const deadRow = page.locator(ROW).filter({ hasText: DEACTIVATE_ID });
  h.check('停用后行关死：effectiveTo=即时时刻', (await deadRow.getByText(localFmt(priceEntryFixtures.DEACTIVATED_AT)).count()) > 0);
  h.check('停用后行关死：操作者落痕 + 无写操作', (await deadRow.getByText('E2E Mock').count()) > 0 && (await deadRow.getByRole('button').count()) === 0);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-price-entry E2E');
  });
