/**
 * AI 平台沙箱域 E2E（#60 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/workspace-fixtures.mjs）。
 *
 * 覆盖验收（#60 五条）：清单渲染契约字段（期望态/实态两列分示）/ 期望态·实态过滤
 * （desired=1&actual=3 组合即捞漂移清单）/ 详情抽屉全字段 + resources + project 引用 /
 * 四写按状态门控（非 DEV 行零操作、封存/置备中仅唤醒——不可达操作不出现）+ 触发正确端点 +
 * 成功后抽屉直填（响应＝动作后观测详情，**不二次回读**——GET 计数钉死）+ 列表刷新 /
 * 写失败透传 provider message 统一 toast（409 WSP_015）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/workspace.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as workspaceFixtures from './support/workspace-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
const DRIFT_ID = '7394120209100200099';

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里最后一条沙箱清单请求（筛选/分页断言用）。 */
function lastListCall(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/workspaces').at(-1);
}

/** 沙箱详情 GET 计数（写成功直填断言用——直填则计数不增）。 */
function detailGetCount(calls) {
  return calls.filter(c => c.method === 'GET' && new RegExp(`/aiplatform/workspaces/${DRIFT_ID}$`).test(c.path)).length;
}

/** NSelect 单选交互：点开筛选表单内第 idx 个下拉、按文案选项（.n-select 限定表单，防与分页器选择器撞）。 */
async function selectOption(page, nth, label) {
  await page.locator('.n-form .n-select').nth(nth).click();
  await page.locator('.n-base-select-option', { hasText: label }).first().click();
  await sleep(200);
}

/** 四写确认弹窗：断言标题/容器名对账锚点后确认（containerPattern 供不同目标行复用）。 */
async function confirmDialog(page, title, containerPattern) {
  const dialog = page.locator('.n-dialog');
  await dialog.getByText(title).first().waitFor({ timeout: 5000 });
  await dialog.getByText(containerPattern).waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
}

/** 漂移主档容器名（确认框对账锚点）。 */
const DRIFT_CONTAINER = /ws-7394120209100200099-app/;

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-workspace E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order，登录落订单页拉清单——
  // 不挂会撞 benign 空成功（data:null）炸 defaultTransform（pageerror 噪音，project E2E 同先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, workspace: workspaceFixtures });

  /* ================= 1. 登录 → 侧栏「沙箱管理」菜单点亮 → 直达沙箱页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「沙箱管理」叶子', menuItemTexts.some(t => t.includes('沙箱管理')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/workspace`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/workspace 且列表渲染', page.url().includes('/aiplatform/workspace'));

  /* ================= 2. 列表渲染契约字段（期望态/实态两列分示 + 卷/封存字节串折算 + 项目引用） ================= */
  h.check('列表首屏渲染 10 行（size=10）', (await page.locator(ROW).count()) === 10);
  const listCall = lastListCall(calls);
  h.check('初始请求 page=1&size=10（1-based 直传）', listCall?.query.includes('page=1') && listCall?.query.includes('size=10'), listCall?.query);
  const firstRow = page.locator(ROW).first();
  h.check('首行 containerName 渲染', await firstRow.getByText('ws-7394120209100500098-app').isVisible());
  h.check('kindName 直读渲染（开发）', await firstRow.getByText('开发', { exact: true }).isVisible());
  h.check('statusName 直读渲染（就绪）', await firstRow.getByText('就绪', { exact: true }).isVisible());
  h.check('期望态/实态两列分示（运行 + 运行中）', (await firstRow.getByText('运行', { exact: true }).count()) > 0 && (await firstRow.getByText('运行中', { exact: true }).count()) > 0);
  h.check('卷大小字节串折算（5 GB）', await firstRow.getByText('5 GB', { exact: true }).isVisible());
  h.check('项目引用列渲染（校园社团招新小程序）', await firstRow.getByText('校园社团招新小程序').isVisible());
  const sealedListRow = page.locator(ROW).filter({ hasText: '口算天天练' });
  h.check('封存行：项目归档后缀 + 封存包大小（100 MB）', (await sealedListRow.getByText('已归档').count()) > 0 && (await sealedListRow.getByText('100 MB', { exact: true }).count()) > 0);
  const provisioningRow = page.locator(ROW).filter({ hasText: 'ws-7394120209100300102-app' });
  h.check('置备中行状态直读（置备中）', (await provisioningRow.getByText('置备中', { exact: true }).count()) > 0);

  /* ================= 3. 期望态/实态过滤：漂移组合 desired=运行 + actual=无容器 ================= */
  await selectOption(page, 0, '运行');
  await selectOption(page, 1, '无容器');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  let q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('漂移过滤绑定 desired=1&actual=3', q.get('desired') === '1' && q.get('actual') === '3', lastListCall(calls)?.query);
  h.check('漂移清单命中 3 行（置备中/漂移/失败）', (await page.locator(ROW).count()) === 3, `实际 ${await page.locator(ROW).count()} 行`);
  h.check('漂移行全为期望运行+实态无容器', (await page.locator(ROW).getByText('运行', { exact: true }).count()) === 3 && (await page.locator(ROW).getByText('无容器', { exact: true }).count()) === 3);

  // 3b. 单维切换：仅期望态=封存（先重置清实态）
  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(400);
  await selectOption(page, 0, '封存');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('单维过滤 desired=3（封存）', q.get('desired') === '3' && q.get('actual') === null, lastListCall(calls)?.query);
  h.check('封存清单唯一行（口算天天练）', (await page.locator(ROW).count()) === 1);

  // 3c. 重置 → 参数清空
  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('重置后请求不带过滤参数', q.get('desired') === null && q.get('actual') === null, lastListCall(calls)?.query);

  /* ================= 4. 分页：翻第 2 页 → page=2（1-based） ================= */
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  h.check('翻第 2 页请求 page=2（零 ±1）', lastListCall(calls)?.query.includes('page=2'), lastListCall(calls)?.query);
  h.check('第 2 页渲染 2 行（共 12 条）', (await page.locator(ROW).count()) === 2);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  /* ================= 5. 详情抽屉：全字段 + resources + project 引用 ================= */
  await page.locator(ROW).filter({ hasText: '教研备课知识库' }).getByRole('button', { name: /详\s*情/ }).click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('预览网络名').waitFor({ timeout: 10000 });
  h.check('抽屉全字段：workspaceId/containerName/networkName', (await drawer.getByText(DRIFT_ID).count()) > 0 && (await drawer.getByText('ws-7394120209100200099-app').count()) > 0 && (await drawer.getByText('ws-7394120209100200099-preview').count()) > 0);
  h.check('抽屉：期望运行/实态无容器分示', (await drawer.locator('.n-tag', { hasText: '运行' }).count()) > 0 && (await drawer.locator('.n-tag', { hasText: '无容器' }).count()) > 0);
  h.check('抽屉：卷大小（2 GB）+ 最近触碰/审计时间列', (await drawer.getByText('2 GB', { exact: true }).count()) > 0 && (await drawer.getByText('2026-09-12 08:15:00').count()) > 0 && (await drawer.getByText('2026-09-10 14:05:00').count()) > 0);
  h.check('抽屉：封存字段不渲染（未封存）', (await drawer.getByText('封存时刻').count()) === 0);
  h.check('抽屉：resources 双资源（PostgreSQL + Redis + 连接串原文）', (await drawer.getByText('PostgreSQL').count()) > 0 && (await drawer.getByText('Redis').count()) > 0 && (await drawer.getByText('postgresql://dev:***@postgres:5432/app').count()) > 0 && (await drawer.getByText('redis://redis:6379/0').count()) > 0);
  h.check('抽屉：project 引用（教研备课知识库 + projectId）', (await drawer.getByText('7392120209100200009').count()) > 0);

  /* ================= 6. 四写门控：按状态显隐（不可达不出现） ================= */
  // 6a. 漂移行（DEV·就绪·期望运行）：四写全开
  await page.keyboard.press('Escape');
  await sleep(600);
  await page.locator(ROW).filter({ hasText: '教研备课知识库' }).getByRole('button', { name: /操\s*作/ }).click();
  await sleep(400);
  let dropdownTexts = await page.locator('.n-dropdown-option').allTextContents();
  h.check('漂移行四写全开（唤醒/休眠/重建/封存）', ['唤醒', '休眠', '重建', '封存'].every(k => dropdownTexts.some(t => t.includes(k))), JSON.stringify(dropdownTexts));
  await page.keyboard.press('Escape');
  await sleep(400);

  // 6b. 非 DEV 行（TEST，第 2 页）：零写操作——不渲染「操作」下拉触发器
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  const testRow = page.locator(ROW).filter({ hasText: '听力训练助手' });
  h.check('非 DEV 行（测试）不出「操作」下拉（WSP_007 不可达不出现）', (await testRow.getByRole('button', { name: /操\s*作/ }).count()) === 0);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  // 6c. 封存行抽屉：仅唤醒（重活三写拒——封存态卷已删先唤醒）
  await page.locator(ROW).filter({ hasText: '口算天天练' }).getByRole('button', { name: /详\s*情/ }).click();
  const sealedDrawer = page.locator('.n-drawer');
  await sealedDrawer.getByText('封存包寻址键').waitFor({ timeout: 10000 });
  const sealedActions = await sealedDrawer.locator('.action-row button').allTextContents();
  h.check('封存抽屉仅唤醒', sealedActions.length === 1 && sealedActions[0].includes('唤醒'), JSON.stringify(sealedActions));
  h.check('封存抽屉：包寻址键 + 卷容缺占位（-）', (await sealedDrawer.getByText('workspace-sealed/7394120209092500097.tar.gz').count()) > 0 && (await sealedDrawer.getByText('-', { exact: true }).count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);

  // 6d. 置备中行抽屉：仅唤醒（重活三写拒——置备在途）+ 无所属项目空态
  await page.locator(ROW).filter({ hasText: 'ws-7394120209100300102-app' }).getByRole('button', { name: /详\s*情/ }).click();
  const provisioningDrawer = page.locator('.n-drawer');
  await provisioningDrawer.getByText('预览网络名').waitFor({ timeout: 10000 });
  const provisioningActions = await provisioningDrawer.locator('.action-row button').allTextContents();
  h.check('置备中抽屉仅唤醒', provisioningActions.length === 1 && provisioningActions[0].includes('唤醒'), JSON.stringify(provisioningActions));
  h.check('置备中抽屉：无所属项目空态（工作区先于项目）', (await provisioningDrawer.getByText('无所属项目', { exact: false }).count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);

  /* ================= 7. 写失败透传 toast（409 WSP_015；行下拉重建路径） ================= */
  state.failNextWorkspaceWrite = true;
  await page.locator(ROW).filter({ hasText: '教研备课知识库' }).getByRole('button', { name: /操\s*作/ }).click();
  await page.locator('.n-dropdown-option', { hasText: '重建' }).click();
  await page.locator('.n-dialog').getByText('ws-7394120209100200099-app').waitFor({ timeout: 5000 });
  await page.locator('.n-dialog').getByRole('button', { name: /确\s*认/ }).click();
  const failToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('WSP_015')));
  h.check('写失败 toast 透传 provider message（WSP_015）', Boolean(failToast), JSON.stringify(failToast));
  h.check('写失败 POST rebuild 端点', calls.some(c => c.method === 'POST' && c.path === `/aiplatform/workspaces/${DRIFT_ID}/rebuild`));
  await sleep(400);

  /* ================= 8. 四写成功链：重建 → 休眠 → 封存（漂移抽屉内，直填断言） ================= */
  await page.locator(ROW).filter({ hasText: '教研备课知识库' }).getByRole('button', { name: /详\s*情/ }).click();
  const writeDrawer = page.locator('.n-drawer');
  await writeDrawer.locator('.action-row').waitFor({ timeout: 10000 });

  // 8a. 重建：漂移收敛回运行中；**无二次回读**（详情 GET 计数不增）+ 列表刷新
  const getsBefore = detailGetCount(calls);
  const listCallsBefore = calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/workspaces').length;
  await writeDrawer.locator('.action-row button', { hasText: '重建' }).click();
  await confirmDialog(page, '强制重建', DRIFT_CONTAINER);
  const rebuildToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('沙箱已重建')));
  h.check('重建成功 toast', Boolean(rebuildToast));
  h.check('重建 POST /workspaces/{id}/rebuild', calls.some(c => c.method === 'POST' && c.path === `/aiplatform/workspaces/${DRIFT_ID}/rebuild`));
  await sleep(600);
  h.check('重建后抽屉直填实态运行中（响应即新事实）', (await writeDrawer.locator('.n-tag', { hasText: '运行中' }).count()) > 0);
  h.check('重建后无二次回读（GET 详情计数不增）', detailGetCount(calls) === getsBefore, `${getsBefore} → ${detailGetCount(calls)}`);
  h.check('重建后列表刷新', calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/workspaces').length > listCallsBefore);

  // 8b. 休眠：期望态转休眠
  await writeDrawer.locator('.action-row button', { hasText: '休眠' }).click();
  await confirmDialog(page, '强制休眠', DRIFT_CONTAINER);
  const hibernateToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('沙箱已休眠')));
  h.check('休眠成功 toast + POST 端点', Boolean(hibernateToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/workspaces/${DRIFT_ID}/hibernate`));
  await sleep(400);
  h.check('休眠后抽屉期望态=休眠（直填）', (await writeDrawer.locator('.n-tag', { hasText: '休眠' }).count()) > 0);

  // 8c. 封存：期望态转封存 + 包元数据出现 + 卷容缺
  await writeDrawer.locator('.action-row button', { hasText: '封存' }).click();
  await confirmDialog(page, '封存沙箱', DRIFT_CONTAINER);
  const sealToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('沙箱已封存')));
  h.check('封存成功 toast + POST 端点', Boolean(sealToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/workspaces/${DRIFT_ID}/seal`));
  await sleep(400);
  h.check('封存后抽屉：期望态=封存 + 包寻址键 + 卷容缺（-）', (await writeDrawer.locator('.n-tag', { hasText: '封存' }).count()) > 0 && (await writeDrawer.getByText(`workspace-sealed/${DRIFT_ID}.tar.gz`).count()) > 0 && (await writeDrawer.getByText('-', { exact: true }).count()) > 0);
  // 封存后重活三写消失（仅剩唤醒）
  const afterSealActions = await writeDrawer.locator('.action-row button').allTextContents();
  h.check('封存后抽屉仅剩唤醒（按态重算）', afterSealActions.length === 1 && afterSealActions[0].includes('唤醒'), JSON.stringify(afterSealActions));
  await page.keyboard.press('Escape');
  await sleep(600);

  /* ================= 9. 唤醒（封存态深度唤醒）：封存字段清空 + 卷探查恢复 ================= */
  await page.locator(ROW).filter({ hasText: '口算天天练' }).getByRole('button', { name: /详\s*情/ }).click();
  const wakeDrawer = page.locator('.n-drawer');
  await wakeDrawer.getByText('封存包寻址键').waitFor({ timeout: 10000 });
  await wakeDrawer.locator('.action-row button', { hasText: '唤醒' }).click();
  await confirmDialog(page, '唤醒沙箱', /ws-7394120209092500097-app/);
  const wakeToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('沙箱已唤醒')));
  h.check('唤醒成功 toast + POST wake 端点', Boolean(wakeToast) && calls.some(c => c.method === 'POST' && c.path === '/aiplatform/workspaces/7394120209092500097/wake'));
  await sleep(600);
  h.check('深度唤醒后：封存字段清空（封存时刻不渲染）', (await wakeDrawer.getByText('封存时刻').count()) === 0);
  h.check('深度唤醒后：期望运行 + 实态运行中 + 卷探查恢复（2 GB）', (await wakeDrawer.locator('.n-tag', { hasText: '运行中' }).count()) > 0 && (await wakeDrawer.getByText('2 GB', { exact: true }).count()) > 0);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-workspace E2E');
  });
