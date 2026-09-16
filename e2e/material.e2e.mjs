/**
 * AI 平台素材域 E2E（#63 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/material-fixtures.mjs）。
 *
 * 覆盖验收（#63 六条）：清单渲染契约字段（kind 裸值 PRD 直显 + operator 两列 + statusName 直读）/
 * status 单选·沉淀时间闭区间（Instant UTC 带 Z 本地折算）·projectId 精确筛选、分页 1-based /
 * 详情抽屉元数据 + content 全文 / 停用⇄启用按状态门控切换（行·抽屉两触发面 + 回执 summary →
 * 抽屉 reload 二次回读）/ 删除（不可逆确认 + 抽屉正开同目标随行关闭 + 刷新后不可见）/
 * 失败透传 provider message 统一 toast（400 KNW_006）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/material.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as materialFixtures from './support/material-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
/** 抽屉内停用靶：003（启用态、未治理）。 */
const DISABLE_ID = materialFixtures.DISABLE_ID;
/** 行内启用靶：002（停用态、陈运营停用痕）。 */
const ENABLE_ID = materialFixtures.ENABLE_ID;
/** 删除靶：005（停用态，第 1 页中段——删除后行数可见减一）。 */
const DELETE_ID = materialFixtures.DELETE_ID;

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里最后一条素材清单请求（筛选/分页断言用）。 */
function lastListCall(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/materials').at(-1);
}

/** ISO Instant（UTC 带 Z）→ 本地时区 'YYYY-MM-DD HH:mm:ss'（镜像页侧 formatDateTime 折算）。 */
const pad = n => String(n).padStart(2, '0');
function localFmt(instant) {
  const d = new Date(instant);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Naive datetimerange：fill 后 Tab 提交（Enter 不吃——成本域先例）。 */
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
    return h.summary('aiplatform-material E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，四域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, material: materialFixtures });

  /* ================= 1. 登录 → 侧栏「知识素材」菜单点亮 → 直达素材页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「知识素材」叶子', menuItemTexts.some(t => t.includes('知识素材')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/material`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/material 且列表渲染', page.url().includes('/aiplatform/material'));

  /* ================= 2. 清单渲染契约字段（kind 裸值 + statusName 直读 + operator 两列） ================= */
  h.check('列表首屏渲染 10 行（size=10）', (await page.locator(ROW).count()) === 10);
  const listCall = lastListCall(calls);
  h.check(
    '初始请求 page=1&size=10、无过滤参数（1-based 直传）',
    listCall?.query.includes('page=1') && listCall?.query.includes('size=10') && !listCall?.query.includes('status') && !listCall?.query.includes('projectId'),
    listCall?.query
  );
  // 首行 = 最新沉淀（沉淀倒序服务端定死）：全契约字段
  const firstRow = page.locator(ROW).first();
  // kind 与 title 同值 'PRD'——精确匹配计 2（两列各一）才能钉住 kind 列在渲染（缺列则只剩 1）
  h.check(
    '首行：id + kind 裸值（PRD 直显）+ title（两列各一）',
    (await firstRow.getByText('357801000000000001').count()) > 0 && (await firstRow.getByText('PRD', { exact: true }).count()) === 2
  );
  h.check('首行：来源项目引用两行（名 + id mono）', (await firstRow.getByText('王十二的官网').count()) > 0 && (await firstRow.getByText('357701050000000010').count()) > 0);
  h.check('首行：statusName 直读（启用 tag）', (await firstRow.locator('.n-tag', { hasText: '启用' }).count()) > 0);
  h.check('首行：sunkAt 本地折算', (await firstRow.getByText(localFmt('2026-09-15T02:00:00Z')).count()) > 0);
  h.check('首行：未治理操作者占位（-）', (await firstRow.getByText('-', { exact: true }).count()) > 0);
  // 停用态行：tag + 陈运营操作者两列 + 按状态门控（给启用、无停用）
  const disabledRow = page.locator(ROW).filter({ hasText: ENABLE_ID });
  h.check('停用行：statusName 直读（停用 tag）', (await disabledRow.locator('.n-tag', { hasText: '停用' }).count()) > 0);
  h.check('停用行：operator 两列（陈运营 + id）', (await disabledRow.getByText('陈运营').count()) > 0 && (await disabledRow.getByText('3', { exact: true }).count()) > 0);
  h.check('停用行：按状态门控——启用按钮在、停用按钮不出现', (await disabledRow.getByRole('button', { name: /启\s*用/ }).count()) > 0 && (await disabledRow.getByRole('button', { name: /停\s*用/ }).count()) === 0);
  h.check('停用行：删除按钮在（不可逆恒门控 hasAuth）', (await disabledRow.getByRole('button', { name: /删\s*除/ }).count()) > 0);
  // 启用态行：给停用 + 删除、无启用（门控另一侧）
  const enabledRow = page.locator(ROW).filter({ hasText: DISABLE_ID });
  h.check('启用行：按状态门控——停用按钮在、启用按钮不出现', (await enabledRow.getByRole('button', { name: /停\s*用/ }).count()) > 0 && (await enabledRow.getByRole('button', { name: /启\s*用/ }).count()) === 0);

  /* ================= 3. status 单选 + projectId 精确过滤 + 重置 ================= */
  await page.locator('.n-form .n-select').first().click();
  await page.locator('.n-base-select-option', { hasText: '停用' }).first().click();
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  let q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('status 单选过滤绑定 status=2（单值直传，非逗号串）', q.get('status') === '2', lastListCall(calls)?.query);
  h.check('停用过滤命中 4 行', (await page.locator(ROW).count()) === 4, `实际 ${await page.locator(ROW).count()} 行`);

  await page.getByPlaceholder('来源项目 ID 精确').fill(materialFixtures.COMBO_PROJECT_ID);
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('projectId 精确过滤绑定（与 status 可组合）', q.get('projectId') === materialFixtures.COMBO_PROJECT_ID && q.get('status') === '2', lastListCall(calls)?.query);
  h.check('组合过滤命中 1 行（停用 ∩ 项目 012 = 005）', (await page.locator(ROW).count()) === 1, `实际 ${await page.locator(ROW).count()} 行`);

  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('重置后请求不带过滤参数', q.get('status') === null && q.get('projectId') === null, lastListCall(calls)?.query);

  /* ================= 4. 沉淀时间闭区间过滤（Instant UTC 带 Z 本地折算） ================= */
  // 窗 [2026-09-01 00:00, 2026-09-30 23:59] 本地——时区无关命中全部 9 月行（8 月两行排除）
  await fillRange(page, '2026-09-01 00:00:00', '2026-09-30 23:59:00');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  const expectedFrom = `${new Date('2026-09-01T00:00:00').toISOString().slice(0, 19)}Z`;
  const expectedTo = `${new Date('2026-09-30T23:59:00').toISOString().slice(0, 19)}Z`;
  h.check('sunkFrom/sunkTo Instant UTC 带 Z（本地折算）', q.get('sunkFrom') === expectedFrom && q.get('sunkTo') === expectedTo, lastListCall(calls)?.query);
  h.check('沉淀窗命中 9 月 10 行（8 月早期沉淀排除）', (await page.locator(ROW).count()) === 10, `实际 ${await page.locator(ROW).count()} 行`);
  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(600);

  /* ================= 5. 分页：翻第 2 页 → page=2（1-based）+ 8 月行 ================= */
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  h.check('翻第 2 页请求 page=2（零 ±1）', lastListCall(calls)?.query.includes('page=2'), lastListCall(calls)?.query);
  h.check('第 2 页渲染 2 行（共 12 条）', (await page.locator(ROW).count()) === 2);
  h.check('第 2 页 8 月早期沉淀行（本地折算）', (await page.locator(ROW).getByText(localFmt('2026-08-20T02:00:00Z')).count()) > 0);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  /* ================= 6. 详情抽屉：元数据全字段 + content 全文 ================= */
  await page.locator(ROW).filter({ hasText: DISABLE_ID }).getByRole('button', { name: /详\s*情/ }).click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('素材详情').first().waitFor({ timeout: 5000 });
  // 元数据异步加载（抽屉开启即拉详情）——等 content 锚点出现再断言（id 串会撞 pre 首行，锚点用 CONTENT_MARK）
  await drawer.getByText(materialFixtures.CONTENT_MARK).waitFor({ timeout: 5000 });
  h.check('抽屉：元数据 id/kind/标题/项目引用渲染', (await drawer.getByText(DISABLE_ID).count()) > 0 && (await drawer.getByText('王十二的官网').count()) > 0);
  h.check('抽屉：statusName 直读（启用 tag）+ 沉淀时间本地折算', (await drawer.locator('.n-tag', { hasText: '启用' }).count()) > 0 && (await drawer.getByText(localFmt('2026-09-13T08:00:00Z')).count()) > 0);
  h.check('抽屉：未治理操作者占位（-）', (await drawer.getByText('-', { exact: true }).count()) > 0);
  h.check('抽屉：content 全文锚点 + 多段呈现（段落断=切点）', (await drawer.getByText(materialFixtures.CONTENT_MARK).count()) > 0 && (await drawer.getByText('## 验收').count()) > 0);
  // 操作行按状态门控：启用态素材给停用+删除、无启用
  h.check('抽屉：启用态操作行（停用+删除、无启用）', (await drawer.getByRole('button', { name: /停\s*用/ }).count()) > 0 && (await drawer.getByRole('button', { name: /删\s*除/ }).count()) > 0 && (await drawer.getByRole('button', { name: /^启\s*用$/ }).count()) === 0);

  /* ================= 7. 抽屉内停用链：可逆提示 + POST disable + 抽屉 reload（回执 summary 无 content）+ 刷新 ================= */
  await drawer.getByRole('button', { name: /停\s*用/ }).click();
  const dialog = page.locator('.n-dialog');
  await dialog.getByText('停用素材').waitFor({ timeout: 5000 });
  h.check('停用确认框：目标对账（素材标题）', (await dialog.getByText('目标：PRD').count()) > 0);
  h.check('停用确认框：可逆提示（可经启用恢复）', (await dialog.getByText('可逆').count()) > 0);
  const detailGetsBefore = calls.filter(c => c.method === 'GET' && c.path === `/aiplatform/materials/${DISABLE_ID}`).length;
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const disabledToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已停用')));
  h.check('停用成功 toast + POST disable 端点', Boolean(disabledToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/materials/${DISABLE_ID}/disable`));
  // 回执是 summary（无 content）——抽屉开着须二次回读详情
  await sleep(800);
  h.check('抽屉 reload 二次回读（回执 summary → 详情重取）', calls.filter(c => c.method === 'GET' && c.path === `/aiplatform/materials/${DISABLE_ID}`).length > detailGetsBefore);
  h.check('抽屉回读后如实呈现：停用 tag + 操作者落痕 + 按钮切到启用', (await drawer.locator('.n-tag', { hasText: '停用' }).count()) > 0 && (await drawer.getByText('E2E Mock').count()) > 0 && (await drawer.getByRole('button', { name: /启\s*用/ }).count()) > 0);
  h.check('列表刷新：行状态切停用（tag）', (await page.locator(ROW).filter({ hasText: DISABLE_ID }).locator('.n-tag', { hasText: '停用' }).count()) > 0);
  // 关抽屉（Escape）——第 8 段行内启用需点表格行，抽屉 modal 遮罩会挡行操作
  await page.keyboard.press('Escape');
  await sleep(600);
  h.check('抽屉已关（行操作可达）', !(await page.locator('.n-drawer').isVisible()));

  /* ================= 8. 行内启用链：POST enable + 行恢复启用态 + 操作者落痕 ================= */
  await page.locator(ROW).filter({ hasText: ENABLE_ID }).getByRole('button', { name: /启\s*用/ }).click();
  await dialog.getByText('启用素材').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const enabledToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已启用')));
  h.check('启用成功 toast + POST enable 端点', Boolean(enabledToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/materials/${ENABLE_ID}/enable`));
  await sleep(600);
  const reEnabledRow = page.locator(ROW).filter({ hasText: ENABLE_ID });
  h.check('启用后行恢复启用态（tag + 停用按钮回归）', (await reEnabledRow.locator('.n-tag', { hasText: '启用' }).count()) > 0 && (await reEnabledRow.getByRole('button', { name: /停\s*用/ }).count()) > 0);

  /* ================= 9. 抽屉内删除链：不可逆确认 + DELETE 端点 + 抽屉随行关闭 + 刷新后不可见 ================= */
  await page.locator(ROW).filter({ hasText: DELETE_ID }).getByRole('button', { name: /详\s*情/ }).click();
  await drawer.getByText('素材详情').first().waitFor({ timeout: 5000 });
  await drawer.getByRole('button', { name: /删\s*除/ }).click();
  await dialog.getByText('删除素材').waitFor({ timeout: 5000 });
  h.check('删除确认框：不可逆提示（治理移除、不动来源项目）', (await dialog.getByText('不可逆').count()) > 0 && (await dialog.getByText('不动来源项目').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const deletedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已删除')));
  h.check('删除成功 toast + DELETE 端点', Boolean(deletedToast) && calls.some(c => c.method === 'DELETE' && c.path === `/aiplatform/materials/${DELETE_ID}`));
  await sleep(800);
  h.check('删除后抽屉随行关闭（素材已不可见）', (await page.locator('.n-drawer').count()) === 0 || !(await page.locator('.n-drawer').isVisible()));
  h.check('列表刷新后素材行消失（治理移除）', (await page.locator(ROW).filter({ hasText: DELETE_ID }).count()) === 0);
  h.check('删除后清单 11 条（第 1 页 10 行仍满）', (await page.locator(ROW).count()) === 10, `实际 ${await page.locator(ROW).count()} 行`);

  /* ================= 10. 失败链：400 KNW_006 透传 toast、行状态不变 ================= */
  state.failNextMaterialWrite = true;
  await page.locator(ROW).filter({ hasText: '357801000000000004' }).getByRole('button', { name: /停\s*用/ }).click();
  await dialog.getByText('停用素材').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const failToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('KNW_006')));
  h.check('失败 toast 透传 provider message（KNW_006）', Boolean(failToast), JSON.stringify(failToast));
  await sleep(600);
  h.check('失败后行状态不变（仍启用 tag）', (await page.locator(ROW).filter({ hasText: '357801000000000004' }).locator('.n-tag', { hasText: '启用' }).count()) > 0);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-material E2E');
  });
