/**
 * AI 平台项目域 E2E（#58/#59 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/project-fixtures.mjs）。
 *
 * 覆盖验收（#58 五条）：列表渲染契约字段（含归档照读）/ 四维筛选绑定查询参数（status 三档单选——
 * 与订单多选逗号串有意不同 / 1-based 分页）/ 详情抽屉基本信息含订单引用+成本指针+工作区引用 /
 * 对话史 text·kind·answered·at 且 question·closing·attachments 载荷跳过 / PRD 全文 /
 * 版本列表新→旧 + 版本详情锚定收尾卡含 closing 缺位兜底。
 *
 * 覆盖验收（#59 交付文件）：文件树按 path 折叠（目录合成 + 行内 size）/ 点文本文件内嵌只读
 * （files/content）/ 拒读一态兜底（4022 超限与 4023 非文本两码同 UI 态——钉死「不按业务码分三态」）/
 * 下载文件包（files/package tar.gz 二进制流无信封）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/project.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as projectFixtures from './support/project-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里最后一条项目清单请求（筛选/分页断言用）。 */
function lastListCall(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/projects').at(-1);
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-project E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  const { calls } = await installAiplatformMocks(page, { order: orderFixtures, project: projectFixtures });

  /* ================= 1. 登录 → 侧栏「项目管理」菜单点亮 → 直达项目页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  // Soybean 侧栏菜单渲染为 treeitem 角色（非 .n-menu 类）；等待其渲染（动态菜单经 /menus/my 异步下发）
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「AI 平台」目录', menuItemTexts.some(t => t.includes('AI 平台')));
  h.check('侧栏渲染「项目管理」叶子', menuItemTexts.some(t => t.includes('项目管理')));
  // 菜单→路由跳转在动态模式下与 addRoute 时序竞态（点菜单可能弹回 home，菜单链路 seam #57 已证）——
  // 本票验收项目页本身，直达 URL 规避竞态（订单域 E2E 亦 home 直达）
  await page.goto(`${BASE}/aiplatform/project`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/project 且列表渲染', page.url().includes('/aiplatform/project'));

  /* ================= 2. 列表渲染契约字段（statusName 直读 / 归档布尔列照读） ================= */
  h.check('列表首屏渲染 10 行（size=10）', (await page.locator(ROW).count()) === 10);
  const listCall = lastListCall(calls);
  h.check('初始请求 page=1&size=10（1-based 直传）', listCall?.query.includes('page=1') && listCall?.query.includes('size=10'), listCall?.query);
  const firstRow = page.locator(ROW).first();
  h.check('首行渲染项目名称（智能排课助手）', await firstRow.getByText('智能排课助手').isVisible());
  h.check('typeName 直读渲染（电商）', await firstRow.getByText('电商', { exact: true }).isVisible());
  h.check('statusName 直读渲染（进行中）', await firstRow.getByText('进行中').isVisible());
  h.check('归档布尔列渲染（否）', await firstRow.getByText('否', { exact: true }).isVisible());
  h.check('ownerDisplayName 渲染（王十二）', await firstRow.getByText('王十二').isVisible());
  const archivedRow = page.locator(ROW).filter({ hasText: '幼儿绘本共读机器人' });
  h.check('归档行照读（已归档 + 是）', (await archivedRow.getByText('已归档').count()) > 0 && (await archivedRow.getByText('是', { exact: true }).count()) > 0);
  h.check('缺档 owner 占位（-）', (await page.locator(ROW).filter({ hasText: '幼儿绘本共读机器人' }).getByText('-', { exact: true }).count()) > 0);

  /* ================= 3. 四维筛选：status 三档单选 + 时间区间 + externalId + projectId ================= */
  // 3a. 状态单选：已归档（单值 status=3，非逗号串）
  await page.locator('.n-radio-button', { hasText: '已归档' }).click();
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  let q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('状态单选绑 status=3（单值非逗号串）', q.get('status') === '3', lastListCall(calls)?.query);
  h.check('status=3 全行已归档', (await page.locator(ROW).filter({ hasText: '已归档' }).count()) === (await page.locator(ROW).count()));

  // 3b. 切档：进行中 → status=1
  await page.locator('.n-radio-button', { hasText: /^进行中$/ }).click();
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('状态单选切档绑 status=1', q.get('status') === '1', lastListCall(calls)?.query);

  // 3c. 全组合：进行中 + 时间区间 + externalId + projectId 精确
  const rangeInputs = page.locator('.n-date-picker input');
  await rangeInputs.nth(0).click();
  await rangeInputs.nth(0).fill('2026-09-01 00:00:00');
  await rangeInputs.nth(0).press('Tab');
  await rangeInputs.nth(1).click();
  await rangeInputs.nth(1).fill('2026-09-30 23:59:59');
  await rangeInputs.nth(1).press('Tab');
  await page.getByPlaceholder('账号 External ID').fill('ext-zhaoliu');
  await page.getByPlaceholder('项目 ID（精确）').fill('7392120209100500010');
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check(
    '筛选参数全绑定（status=1/createdFrom/To/externalId/projectId）',
    q.get('status') === '1' &&
      q.get('createdFrom') === '2026-09-01T00:00:00' &&
      q.get('createdTo') === '2026-09-30T23:59:59' &&
      q.get('externalId') === 'ext-zhaoliu' &&
      q.get('projectId') === '7392120209100500010',
    lastListCall(calls)?.query
  );
  h.check('全组合筛选命中 1 行（校园社团招新小程序）', (await page.locator(ROW).count()) === 1);

  // 3d. 重置 → 回全部档、参数清空
  await page.getByRole('button', { name: /重\s*置/ }).click();
  await sleep(600);
  q = new URLSearchParams(lastListCall(calls)?.query ?? '');
  h.check('重置后请求不带筛选参数', q.get('status') === null && q.get('externalId') === null && q.get('projectId') === null, lastListCall(calls)?.query);

  /* ================= 4. 分页：翻第 2 页 → page=2（1-based） ================= */
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^2$/ }).click();
  await sleep(600);
  h.check('翻第 2 页请求 page=2（零 ±1）', lastListCall(calls)?.query.includes('page=2'), lastListCall(calls)?.query);
  h.check('第 2 页渲染 2 行（共 12 条）', (await page.locator(ROW).count()) === 2);
  await page.locator('.n-pagination .n-pagination-item', { hasText: /^1$/ }).click();
  await sleep(600);

  /* ================= 5. 详情抽屉·基本信息 tab：清单字段 + 订单引用 + 成本指针 + 工作区引用 ================= */
  await page.locator(ROW).filter({ hasText: '教研备课知识库' }).getByRole('button', { name: /详\s*情/ }).click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('工作区 ID').waitFor({ timeout: 10000 });
  h.check('基本信息：工作区引用 workspaceId', (await drawer.getByText('7394120209100200099').count()) > 0);
  h.check('基本信息：activeOrder 未终结订单引用（已报价）', (await drawer.getByText('7393120209100200009').count()) > 0 && (await drawer.getByText('已报价').count()) > 0);
  h.check('基本信息：成本指针 unpriced=false 完整态', (await drawer.getByText('成本完整', { exact: false }).count()) > 0);
  h.check('基本信息：归档标记（否）', (await drawer.getByText('否', { exact: true }).count()) > 0);
  h.check('基本信息：PRD 产出/生成时点', (await drawer.getByText('2026-09-10 15:20:00').count()) > 0 && (await drawer.getByText('2026-09-10 18:46:00').count()) > 0);

  /* ================= 6. 对话史 tab：text/kind/answered/at，载荷跳过 ================= */
  await drawer.locator('.n-tabs-tab', { hasText: '对话史' }).click();
  await drawer.getByText('我们想做一个教研备课知识库').waitFor({ timeout: 10000 });
  h.check('对话史：用户发言渲染', (await drawer.getByText('我们想做一个教研备课知识库').count()) > 0);
  h.check('对话史：智能体回复渲染', (await drawer.getByText('收到。我先梳理需求').count()) > 0);
  h.check('对话史：作答条目渲染', (await drawer.getByText('检索优先，批注可以放到下一轮。').count()) > 0);
  for (const k of ['用户', '智能体', '问答', '作答', '收尾卡', '平台引导']) {
    const n = await drawer.locator('.n-tag', { hasText: k }).count();
    if (n === 0) h.check(`对话史 kind 标签「${k}」存在`, false, '未渲染');
  }
  h.check('对话史：已答/待答双态', (await drawer.getByText('已答', { exact: true }).count()) > 0 && (await drawer.getByText('待答', { exact: true }).count()) > 0);
  h.check('对话史：question/closing 载荷跳过（sentinel 不入 DOM）', (await drawer.locator(':text("QUESTION_PAYLOAD_SENTINEL")').count()) === 0);
  h.check('对话史：全量 8 条同序', (await drawer.locator('.conversation-entry').count()) === 8);

  /* ================= 7. PRD tab：全文 + updatedAt ================= */
  await drawer.locator('.n-tabs-tab', { hasText: 'PRD' }).click();
  await drawer.getByText('组内教案分散在个人网盘，检索困难。').waitFor({ timeout: 10000 });
  h.check('PRD 全文渲染（markdown 正文）', (await drawer.getByText('组内教案分散在个人网盘，检索困难。').count()) > 0);
  h.check('PRD updatedAt 渲染', (await drawer.getByText('2026-09-10 15:20:00').count()) > 0);

  /* ================= 8. 版本 tab：列表新→旧 + 详情锚定收尾卡（含回滚/缺位兜底） ================= */
  await drawer.locator('.n-tabs-tab', { hasText: '版本' }).click();
  const versionRows = drawer.locator('.n-data-table-tbody .n-data-table-tr');
  await versionRows.first().waitFor({ timeout: 10000 });
  // 最新版本详情自动锚定（closing summary 为详情独有文本，兼作 detail 渲染信号）
  await drawer.getByText(/协同批注落地：教案页内批注/).waitFor({ timeout: 10000 });
  h.check('版本列表渲染 3 行', (await versionRows.count()) === 3);
  const subjects = await versionRows.allTextContents();
  h.check('版本列表新→旧排序', subjects[0].includes('协同批注') && subjects[1].includes('首版知识库骨架') && subjects[2].includes('回滚'), JSON.stringify(subjects));
  h.check('版本详情：commitHash 渲染（全 hash，详情独有）', (await drawer.getByText('9f31c02a7d4e8b6a0c1f23456789abcdef01234').count()) > 0);
  h.check('版本详情：runId 渲染', (await drawer.getByText('run-20260912-b2').count()) > 0);
  h.check('版本详情：收尾卡 summary 渲染', (await drawer.getByText(/协同批注落地：教案页内批注/).count()) > 0);
  // 点首版行 → prdNote 载荷渲染
  await versionRows.nth(1).click();
  await drawer.getByText('补充第二轮批注范围').waitFor({ timeout: 10000 });
  h.check('版本详情切换：首版 closing 渲染（prdNote）', (await drawer.getByText('补充第二轮批注范围').count()) > 0);
  // 点回滚行 → runId 空 + rollbackFrom + closing 缺位兜底（全 hash 详情独有，兼作渲染信号）
  await versionRows.nth(2).click();
  await drawer.getByText('8e21b0196c3d7a590b0e123456789abcdef0123').waitFor({ timeout: 10000 });
  const rollbackDetailCalls = calls.filter(c => c.path.endsWith('/versions/7d10a0185b2c6948a0d0123456789abcdef012')).length;
  h.check('版本详情请求 versions/{ref} 端点', rollbackDetailCalls > 0);
  h.check('版本详情回滚行：rollbackFrom 渲染', (await drawer.getByText('回滚源版本').count()) > 0 && (await drawer.getByText('8e21b0196c3d7a590b0e123456789abcdef0123').count()) > 0);
  h.check('版本详情回滚行：closing 缺位兜底文案', (await drawer.getByText('收尾卡缺位').count()) > 0);

  /* ================= 9. 归档项目照读：详情四 tab 全可读 ================= */
  await page.keyboard.press('Escape');
  await sleep(600);
  await page.locator(ROW).filter({ hasText: '口算天天练' }).getByRole('button', { name: /详\s*情/ }).click();
  const archivedDrawer = page.locator('.n-drawer');
  await archivedDrawer.getByText('工作区 ID').waitFor({ timeout: 10000 });
  h.check('归档项目：基本信息照读（已归档 + 是）', (await archivedDrawer.getByText('已归档').count()) > 0 && (await archivedDrawer.getByText('是', { exact: true }).count()) > 0);
  h.check('归档项目：latestOrder 承接（已归档订单）', (await archivedDrawer.getByText('7393120209092500007').count()) > 0);
  await archivedDrawer.locator('.n-tabs-tab', { hasText: '对话史' }).click();
  await archivedDrawer.getByText('口算练习要能按年级出题').waitFor({ timeout: 10000 });
  h.check('归档项目：对话史照读', (await archivedDrawer.getByText('口算练习要能按年级出题').count()) > 0);
  await archivedDrawer.locator('.n-tabs-tab', { hasText: 'PRD' }).click();
  await archivedDrawer.getByText('按年级出题、自动判分、错题回顾。').waitFor({ timeout: 10000 });
  h.check('归档项目：PRD 照读', (await archivedDrawer.getByText('按年级出题、自动判分、错题回顾。').count()) > 0);
  await archivedDrawer.locator('.n-tabs-tab', { hasText: '版本' }).click();
  await archivedDrawer.getByText('口算出题与判分落地').waitFor({ timeout: 10000 });
  h.check('归档项目：版本照读', (await archivedDrawer.getByText('口算出题与判分落地').count()) > 0);

  /* ================= 10. activeOrder 转空 + unpriced + PRD 未产出 toast ================= */
  await page.keyboard.press('Escape');
  await sleep(600);
  await page.locator(ROW).filter({ hasText: '校园社团招新小程序' }).getByRole('button', { name: /详\s*情/ }).click();
  const paidDrawer = page.locator('.n-drawer');
  await paidDrawer.getByText('工作区 ID').waitFor({ timeout: 10000 });
  h.check('已支付项目：activeOrder 转空占位', (await paidDrawer.getByText('无未终结订单', { exact: false }).count()) > 0);
  h.check('已支付项目：成本指针 unpriced=true 警示', (await paidDrawer.getByText('存在未计价用量').count()) > 0);
  await paidDrawer.locator('.n-tabs-tab', { hasText: 'PRD' }).click();
  const prdToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('PRJ_015')));
  h.check('PRD 未产出 toast 透传 provider message（PRJ_015）', Boolean(prdToast), JSON.stringify(prdToast));

  /* ================= 11. 交付文件 tab（#59）：文件树 + 查看器 + 拒读兜底 + 下载包 ================= */
  await paidDrawer.locator('.n-tabs-tab', { hasText: '交付文件' }).click();
  const treeNode = paidDrawer.locator('.files-tree .n-tree-node');
  await treeNode.first().waitFor({ timeout: 10000 });

  // 11a. 文件树按 path 折叠：只列文件契约（[{path,size}]）→ 前端合成目录（assets/docs/src）+ 根级文件
  h.check(
    '文件树：根级目录合成（assets/docs/src）+ 根级文件 package.json',
    (await treeNode.filter({ hasText: 'assets' }).count()) > 0 &&
      (await treeNode.filter({ hasText: 'docs' }).count()) > 0 &&
      (await treeNode.filter({ hasText: 'src' }).count()) > 0 &&
      (await treeNode.filter({ hasText: 'package.json' }).count()) > 0
  );
  // 行内显 size（B/KB/MB 折算；根级目录默认展开 → 一层子项可见）
  h.check(
    '文件树：行内显 size（512 B / 12 MB）',
    (await paidDrawer.getByText('512 B', { exact: true }).isVisible()) &&
      (await paidDrawer.getByText('12 MB', { exact: true }).isVisible())
  );
  h.check('文件树：根级目录默认展开（hero.png 5 MB 可见）', await paidDrawer.getByText('5 MB', { exact: true }).isVisible());
  h.check('文件树：深层子目录折叠（page.tsx 初始不可见）', !(await paidDrawer.locator('.n-tree-node', { hasText: 'page.tsx' }).first().isVisible()));

  // 11b. 点文本文件内嵌只读
  await treeNode.filter({ hasText: 'package.json' }).click();
  await paidDrawer.getByText('club-recruit-miniapp').waitFor({ timeout: 10000 });
  h.check('查看器：根级文件内容内嵌只读（package.json）', (await paidDrawer.getByText('club-recruit-miniapp').count()) > 0);
  await treeNode.filter({ hasText: 'PRD.md' }).click();
  await paidDrawer.getByText('线上报名、社团审核、名单一键导出。').waitFor({ timeout: 10000 });
  h.check('查看器：目录内文件切换（docs/PRD.md）', (await paidDrawer.getByText('线上报名、社团审核、名单一键导出。').count()) > 0);
  // 展开深层子目录（expand-on-click）后点叶子
  await treeNode.filter({ hasText: /^app$/ }).click();
  await paidDrawer.locator('.n-tree-node', { hasText: 'page.tsx' }).first().waitFor({ timeout: 10000 });
  await paidDrawer.locator('.n-tree-node', { hasText: 'page.tsx' }).first().click();
  await paidDrawer.getByText('社团招新报名入口').waitFor({ timeout: 10000 });
  h.check('查看器：深层文件内容（src/app/page.tsx）', (await paidDrawer.getByText('社团招新报名入口').count()) > 0);
  h.check(
    'content 请求 path 参数原样回传（src/app/page.tsx）',
    calls.some(c => c.path.endsWith('/files/content') && c.query.includes('path=src%2Fapp%2Fpage.tsx')),
    JSON.stringify(calls.filter(c => c.path.endsWith('/files/content')).map(c => c.query))
  );

  // 11c. 拒读一态兜底：4023 非文本 / 4022 超 1MiB——两码同「无法预览」态 + 各自透传 message
  await treeNode.filter({ hasText: 'hero.png' }).click();
  await paidDrawer.locator('.file-unavailable').waitFor({ timeout: 10000 });
  h.check(
    '拒读一态兜底（非文本 4023）：无法预览 + 透传 message',
    (await paidDrawer.getByText('无法预览').count()) > 0 && (await paidDrawer.getByText('非文本文件，无法在线查看（PRJ_023）').count()) > 0
  );
  await treeNode.filter({ hasText: 'sitemap.raw.map' }).click();
  await paidDrawer.getByText('文件超过在线查看上限（1 MiB）（PRJ_022）').waitFor({ timeout: 10000 });
  h.check(
    '拒读一态兜底（超限 4022）：同态切换 + 透传 message（不按业务码分三态）',
    (await paidDrawer.locator('.file-unavailable').count()) > 0 &&
      (await paidDrawer.getByText('文件超过在线查看上限（1 MiB）（PRJ_022）').count()) > 0
  );

  // 11d. 下载文件包：tar.gz 二进制流（无信封）
  await paidDrawer.getByRole('button', { name: '下载文件包' }).click();
  h.check(
    '文件包 GET files/package（二进制流端点）',
    calls.some(c => c.path.endsWith('/files/package') && c.method === 'GET')
  );
  const pkgToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('文件包下载成功')));
  h.check('文件包下载成功 toast', Boolean(pkgToast), JSON.stringify(pkgToast));
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-project E2E');
  });
