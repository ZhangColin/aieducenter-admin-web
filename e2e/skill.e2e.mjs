/**
 * AI 平台技能域 E2E（#67 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 派生自 /v3/api-docs，见 support/skill-fixtures.mjs）。
 *
 * 覆盖验收（#67 十条）：清单渲染契约字段（无分页控件、内置在前、内置行 `-` 占位、可更新标记
 * true/false/null 三态）/ 详情抽屉三节（基本信息全字段 + frontmatter 泛型键值四型值 + 正文全文）/
 * 安装单步表单（repoUrl + 排除目录段 tag 手输 → POST body 断言；成功不关窗切回执态「本次装入
 * N 项」+ 完成即关 + 父页刷新；失败 502 SKL_004 留窗透传）/ 动作矩阵门控（停用⇄启用互斥 +
 * 更新/卸载/留痕仅安装行——内置行仅停用）/ 停用⇄启用 / 卸载（确认 + toast + 行消失；409 SKL_008
 * 透传）/ 显式更新（$dialog 来源包对账 → 回执态 modal from→to + 移除名单 + 终态行集 + from==to
 * 幂等呈现；409 SKL_013 透传）/ 更新留痕（行级动作 → NDrawer 时间线倒序、按来源包 query）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/skill.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as skillFixtures from './support/skill-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
/** 各靶（fixtures 单一事实源）：a1 停用 / a2 启用 / b1 卸载。 */
const DISABLE_ID = skillFixtures.DISABLE_ID;
const ENABLE_ID = skillFixtures.ENABLE_ID;
const UNINSTALL_ID = skillFixtures.UNINSTALL_ID;

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里最后一条技能清单请求。 */
function lastListCall(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/skills').at(-1);
}

/** ISO Instant（UTC 带 Z）→ 本地时区 'YYYY-MM-DD HH:mm:ss'（镜像页侧 formatDateTime 折算）。 */
const pad = n => String(n).padStart(2, '0');
function localFmt(instant) {
  const d = new Date(instant);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 开行「操作」下拉 → 返回选项文本数组（收窄到最后一个 menu 实例——前序菜单 leave 过渡会短暂并存）。 */
async function openRowMenu(page, rowLocator) {
  await rowLocator.getByRole('button', { name: /^操\s*作$/ }).click();
  await sleep(300);
  const menu = page.locator('.n-dropdown-menu').last();
  await menu.waitFor({ timeout: 5000 });
  const texts = (await menu.locator('.n-dropdown-option').allTextContents()).map(t => t.trim());
  await page.keyboard.press('Escape');
  await sleep(400);
  return texts;
}

/** 开行「操作」下拉并选中指定动作（同一收窄口径；确认流随后接管）。 */
async function pickRowAction(page, rowLocator, label) {
  await rowLocator.getByRole('button', { name: /^操\s*作$/ }).click();
  await sleep(300);
  await page.locator('.n-dropdown-menu').last().locator('.n-dropdown-option', { hasText: label }).first().click();
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-skill E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，六域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, skill: skillFixtures });

  /* ================= 1. 登录 → 侧栏「技能管理」菜单点亮 → 直达技能页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「技能管理」叶子', menuItemTexts.some(t => t.includes('技能管理')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/skill`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/skill 且列表渲染', page.url().includes('/aiplatform/skill'));

  /* ================= 2. 清单渲染契约字段（无分页 + 内置在前 + 内置行占位 + 可更新三态） ================= */
  h.check('清单全量 8 行（内置 3 + 安装 5，无分页切片）', (await page.locator(ROW).count()) === 8, `实际 ${await page.locator(ROW).count()} 行`);
  h.check('无分页控件（有界目录契约）', (await page.locator('.n-pagination').count()) === 0);
  h.check('初始请求无查询参数', (lastListCall(calls)?.query ?? '') === '', lastListCall(calls)?.query);
  // 服务端排序内置在前：前 3 行 sourceName 均为「内置」、第 4 行起「安装」
  const sourceTexts = await page.locator(ROW).allTextContents();
  h.check('内置在前（前 3 行内置、第 4 行起安装）', sourceTexts.slice(0, 3).every(t => t.includes('内置')) && sourceTexts.slice(3).every(t => t.includes('安装')));
  // 首行（builtin:web-search）：名称 + 四列 null 占位 '-'
  const firstRow = page.locator(ROW).first();
  h.check('内置行：名称直显 + 描述', (await firstRow.getByText('web-search').count()) > 0 && (await firstRow.getByText('联网搜索增强工具技能').count()) > 0);
  h.check('内置行：来源包/版本/操作者/可更新均 "-" 占位（null 四列）', (await firstRow.getByText('-', { exact: true }).count()) >= 4);
  h.check('内置行：statusName 直读（启用 tag）', (await firstRow.locator('.n-tag', { hasText: '启用' }).count()) > 0);
  // 安装行 a1：来源包/版本 mono、装者留痕、可更新 true tag
  const installedRow = page.locator(ROW).filter({ hasText: 'pdf-export' });
  h.check('安装行：来源包 + 版本（装时 commit）mono 直读', (await installedRow.getByText(skillFixtures.PACK_A).count()) > 0 && (await installedRow.getByText(skillFixtures.PACK_A_FROM).count()) > 0);
  h.check('安装行：最近操作者（装者留痕）', (await installedRow.getByText('王建设').count()) > 0);
  h.check('安装行：可更新 true →「可更新」tag', (await installedRow.locator('.n-tag', { hasText: '可更新' }).count()) > 0);
  // PACK_B 可更新 false / PACK_C null → 无 tag 有 '-'
  const upToDateRow = page.locator(ROW).filter({ hasText: 'seo-audit' });
  h.check('安装行：可更新 false → "-" 占位', (await upToDateRow.locator('.n-tag', { hasText: '可更新' }).count()) === 0 && (await upToDateRow.getByText('-', { exact: true }).count()) > 0);
  const uncheckedRow = page.locator(ROW).filter({ hasText: 'doc-writer' });
  h.check('安装行：可更新 null（未检查过）→ "-" 占位', (await uncheckedRow.locator('.n-tag', { hasText: '可更新' }).count()) === 0);
  // 停用行 a2：statusName 直读 + 陈运营最近操作
  const disabledRow = page.locator(ROW).filter({ hasText: 'csv-analyzer' });
  h.check('停用行：statusName 直读（停用 tag）+ 操作者', (await disabledRow.locator('.n-tag', { hasText: '停用' }).count()) > 0 && (await disabledRow.getByText('陈运营').count()) > 0);

  /* ================= 3. 详情抽屉（审核面三节：基本信息全字段 + frontmatter 四型值 + 正文全文） ================= */
  await installedRow.getByRole('button', { name: /详\s*情/ }).click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('技能详情').first().waitFor({ timeout: 5000 });
  await drawer.getByText(skillFixtures.CONTENT_MARK).waitFor({ timeout: 5000 });
  h.check('抽屉一节：基本信息全字段（id mono＝TSID 十进制串 opaque 直显 + 名称 + 状态 tag）', (await drawer.getByText(DISABLE_ID).count()) > 0 && (await drawer.getByText('pdf-export').count()) > 0 && (await drawer.locator('.n-tag', { hasText: '启用' }).count()) > 0);
  h.check('抽屉一节：来源/来源包/版本/操作者/可更新', (await drawer.getByText('安装').count()) > 0 && (await drawer.getByText(skillFixtures.PACK_A).count()) > 0 && (await drawer.getByText(skillFixtures.PACK_A_FROM).count()) > 0 && (await drawer.getByText('可更新').count()) > 0);
  h.check('抽屉二节：frontmatter 原始键直出 + string/number 值', (await drawer.getByText('license', { exact: true }).count()) > 0 && (await drawer.getByText('MIT').count()) > 0 && (await drawer.getByText('version', { exact: true }).count()) > 0);
  h.check('抽屉二节：数组值逗号并 + 布尔直读 + 对象 JSON 串', (await drawer.getByText('Read, Write, Bash').count()) > 0 && (await drawer.getByText('{"owner":"acme","tier":"gold"}').count()) > 0);
  h.check('抽屉三节：正文全文锚点 + 多段呈现', (await drawer.getByText('## 使用约束').count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);
  h.check('抽屉已关（行操作可达）', !(await page.locator('.n-drawer').isVisible()));
  // 内置行详情：builtin: 柄两形制直显（opaque 串不数值化；exact 避开 pre 正文首行撞串）
  await page.locator(ROW).filter({ hasText: 'web-search' }).getByRole('button', { name: /详\s*情/ }).click();
  await drawer.getByText('builtin:web-search', { exact: true }).waitFor({ timeout: 5000 });
  h.check('内置行抽屉：builtin: 柄两形制直显', (await drawer.getByText('builtin:web-search', { exact: true }).count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);

  /* ================= 4. 动作矩阵门控：互斥 + 安装行专属（不可达不出现） ================= */
  const builtinRow = page.locator(ROW).filter({ hasText: 'web-search' });
  let opts = await openRowMenu(page, builtinRow);
  h.check('内置行下拉：仅停用（更新/卸载/留痕不可达不出现）', opts.length === 1 && opts[0] === '停用', JSON.stringify(opts));
  opts = await openRowMenu(page, disabledRow);
  h.check('停用行下拉：启用（互斥侧）+ 更新/卸载/留痕（安装行）', opts.includes('启用') && !opts.includes('停用') && opts.includes('更新') && opts.includes('卸载') && opts.includes('留痕'), JSON.stringify(opts));
  opts = await openRowMenu(page, page.locator(ROW).filter({ hasText: 'sql-helper' }));
  h.check('启用行下拉：停用 + 更新/卸载/留痕', opts.includes('停用') && !opts.includes('启用') && opts.includes('更新') && opts.includes('卸载') && opts.includes('留痕'), JSON.stringify(opts));

  /* ================= 5. 停用链：确认（目标对账）→ POST disable → toast + 行态翻转 ================= */
  await pickRowAction(page, installedRow, '停用');
  const dialog = page.locator('.n-dialog');
  await dialog.getByText('停用技能').waitFor({ timeout: 5000 });
  h.check('停用确认框：目标对账（技能名）+ 可逆提示', (await dialog.getByText('目标：pdf-export').count()) > 0 && (await dialog.getByText('可逆').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const disabledToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('技能已停用')));
  h.check('停用成功 toast + POST disable 端点', Boolean(disabledToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/skills/${DISABLE_ID}/disable`));
  await sleep(600);
  h.check('停用后行态翻转（停用 tag + 操作者落痕）', (await installedRow.locator('.n-tag', { hasText: '停用' }).count()) > 0 && (await installedRow.getByText('E2E Mock').count()) > 0);

  /* ================= 6. 启用链：POST enable → 行恢复启用态 ================= */
  await pickRowAction(page, disabledRow, '启用');
  await dialog.getByText('启用技能').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const enabledToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('技能已启用')));
  h.check('启用成功 toast + POST enable 端点', Boolean(enabledToast) && calls.some(c => c.method === 'POST' && c.path === `/aiplatform/skills/${ENABLE_ID}/enable`));
  await sleep(600);
  h.check('启用后行恢复启用态（tag）', (await disabledRow.locator('.n-tag', { hasText: '启用' }).count()) > 0);

  /* ================= 7. 卸载链：不可逆确认 → DELETE → toast + 行消失（回执不消费） ================= */
  const uninstallRow = page.locator(ROW).filter({ hasText: 'seo-audit' });
  await pickRowAction(page, uninstallRow, '卸载');
  await dialog.getByText('卸载技能').waitFor({ timeout: 5000 });
  h.check('卸载确认框：目标对账 + 指派守卫提示（先解绑）', (await dialog.getByText('目标：seo-audit').count()) > 0 && (await dialog.getByText('先解绑').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const uninstalledToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('技能已卸载')));
  h.check('卸载成功 toast（回执不消费）+ DELETE 端点', Boolean(uninstalledToast) && calls.some(c => c.method === 'DELETE' && c.path === `/aiplatform/skills/${UNINSTALL_ID}`));
  await sleep(600);
  h.check('卸载后行消失（清单 7 行）', (await page.locator(ROW).filter({ hasText: 'seo-audit' }).count()) === 0 && (await page.locator(ROW).count()) === 7, `实际 ${await page.locator(ROW).count()} 行`);

  /* ================= 8. 卸载失败链：409 SKL_008 透传 toast、行保留 ================= */
  state.failNextSkillUninstall = true;
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'doc-writer' }), '卸载');
  await dialog.getByText('卸载技能').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const uninstallFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_008')));
  h.check('卸载失败 toast 透传 provider message（SKL_008）', Boolean(uninstallFailToast), JSON.stringify(uninstallFailToast));
  await sleep(600);
  h.check('失败后行保留', (await page.locator(ROW).filter({ hasText: 'doc-writer' }).count()) > 0);

  /* ================= 9. 安装链：单步表单（repoUrl + 排除段 tag 手输）→ 成功不关窗切回执态 ================= */
  await page.getByRole('button', { name: /安装技能/ }).click();
  const modal = page.locator('.n-modal, .n-dialog');
  await modal.getByText('安装技能').first().waitFor({ timeout: 5000 });
  await modal.getByPlaceholder('git 仓库地址（https/ssh）').fill(skillFixtures.INSTALL_REPO_URL);
  // 排除目录段：tag 模式手输两段
  await modal.locator('.n-select').click();
  await modal.locator('.n-select input').fill('deprecated');
  await page.keyboard.press('Enter');
  await modal.locator('.n-select input').fill('archive');
  await page.keyboard.press('Enter');
  h.check('排除段 tag 成段（两 chip）', (await modal.locator('.n-tag', { hasText: 'deprecated' }).count()) > 0 && (await modal.locator('.n-tag', { hasText: 'archive' }).count()) > 0);
  // tag 输入后 select 建议菜单仍开着会挡住正按钮——点 repoUrl 输入框转移焦点收起
  await modal.getByPlaceholder('git 仓库地址（https/ssh）').click();
  await sleep(300);
  await modal.getByRole('button', { name: /^安\s*装$/ }).click();
  await modal.getByText('安装完成').first().waitFor({ timeout: 5000 });
  const installCall = calls.filter(c => c.method === 'POST' && c.path === '/aiplatform/skills/install').at(-1);
  const installBody = JSON.parse(installCall?.body ?? '{}');
  h.check(
    '安装 POST body：repoUrl + excludeDirs 两段（tag 手输落参）',
    installBody.repoUrl === skillFixtures.INSTALL_REPO_URL && JSON.stringify(installBody.excludeDirs) === JSON.stringify(['deprecated', 'archive']),
    installCall?.body
  );
  h.check('回执态：本次装入 2 项 + 条目（name/version/sourcePackage）', (await modal.getByText('本次装入 2 项').count()) > 0 && (await modal.getByText('chart-render').count()) > 0 && (await modal.getByText('slide-builder').count()) > 0);
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(600);
  h.check('完成即关 + 父页刷新（新装入行入列，9 行）', !(await modal.isVisible()) && (await page.locator(ROW).filter({ hasText: 'chart-render' }).count()) > 0 && (await page.locator(ROW).count()) === 9, `实际 ${await page.locator(ROW).count()} 行`);

  /* ================= 10. 安装失败链：502 SKL_004 透传 toast、表单留窗可修正 ================= */
  state.failNextSkillInstall = true;
  await page.getByRole('button', { name: /安装技能/ }).click();
  await modal.getByText('安装技能').first().waitFor({ timeout: 5000 });
  await modal.getByPlaceholder('git 仓库地址（https/ssh）').fill('https://github.com/acme/broken-pack');
  await modal.getByRole('button', { name: /^安\s*装$/ }).click();
  const installFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_004')));
  h.check('安装失败 toast 透传 provider message（SKL_004）', Boolean(installFailToast), JSON.stringify(installFailToast));
  await sleep(600);
  h.check('失败留窗：表单仍可见（可修正重试）', (await modal.getByPlaceholder('git 仓库地址（https/ssh）').isVisible()) === true);
  await modal.getByRole('button', { name: /取\s*消/ }).click();
  await sleep(600);

  /* ================= 11. 显式更新链（真更新）：来源包对账确认 → 回执态 modal → 终态入列 ================= */
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'sql-helper' }), '更新');
  await dialog.getByText('更新技能包').waitFor({ timeout: 5000 });
  h.check('更新确认框：来源包对账 + 整体拒绝提示', (await dialog.getByText(`来源包：${skillFixtures.PACK_A}`).count()) > 0 && (await dialog.getByText('整体拒绝').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  await modal.getByText('更新完成').first().waitFor({ timeout: 5000 });
  const updateCall = calls.filter(c => c.method === 'POST' && c.path === '/aiplatform/skills/update').at(-1);
  h.check('更新 POST body：sourcePackage 回传', JSON.parse(updateCall?.body ?? '{}').sourcePackage === skillFixtures.PACK_A, updateCall?.body);
  h.check('回执态：from→to（快照翻新）', (await modal.getByText(`${skillFixtures.PACK_A_FROM} → ${skillFixtures.PACK_A_TO}`).count()) > 0);
  h.check('回执态：移除名单（sql-helper）', (await modal.locator('.n-tag', { hasText: 'sql-helper' }).count()) > 0);
  h.check('回执态：终态行集（翻新 + 新增 diagram-draw）', (await modal.getByText('csv-analyzer').count()) > 0 && (await modal.getByText('diagram-draw').count()) > 0);
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(800);
  h.check('更新后清单如实：移除行消失 + 新增行入列 + 版本翻新', (await page.locator(ROW).filter({ hasText: 'sql-helper' }).count()) === 0 && (await page.locator(ROW).filter({ hasText: 'diagram-draw' }).count()) > 0 && (await page.locator(ROW).filter({ hasText: skillFixtures.PACK_A_TO }).count()) > 0);

  /* ================= 12. 显式更新链（no-op）：from==to 幂等呈现 + 无移除 ================= */
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'doc-writer' }), '更新');
  await dialog.getByText('更新技能包').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  await modal.getByText('更新完成').first().waitFor({ timeout: 5000 });
  h.check('no-op 回执：显式「远端未前进，未落痕」', (await modal.getByText('远端未前进，未落痕').count()) > 0);
  h.check('no-op 回执：移除名单空显「无移除」', (await modal.getByText('无移除').count()) > 0);
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(600);

  /* ================= 13. 更新失败链：409 SKL_013 透传 toast ================= */
  state.failNextSkillUpdate = true;
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'pdf-export' }), '更新');
  await dialog.getByText('更新技能包').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const updateFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_013')));
  h.check('更新失败 toast 透传 provider message（SKL_013）', Boolean(updateFailToast), JSON.stringify(updateFailToast));

  /* ================= 14. 更新留痕：行级动作 → NDrawer 时间线（按来源包 query、倒序） ================= */
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'pdf-export' }), '留痕');
  await page.locator('.n-drawer').getByText('更新留痕').first().waitFor({ timeout: 5000 });
  await sleep(600);
  const tracesCall = calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/skills/update-traces').at(-1);
  h.check('留痕按来源包 query（sourcePackage 必传）', new URLSearchParams(tracesCall?.query ?? '').get('sourcePackage') === skillFixtures.PACK_A, tracesCall?.query);
  const timelineItems = page.locator('.n-timeline .n-timeline-item');
  await timelineItems.first().waitFor({ timeout: 5000 });
  h.check('留痕时间线 3 条（预排 2 + 本次更新落痕 1）', (await timelineItems.count()) === 3, `实际 ${await timelineItems.count()} 条`);
  h.check('倒序（最近先）：首条 to＝本次更新版本', (await timelineItems.first().getByText(skillFixtures.PACK_A_TO).count()) > 0);
  h.check('留痕条目：from→to + 操作者 + 本地折算时间', (await timelineItems.first().getByText(skillFixtures.PACK_A_FROM).count()) > 0 && (await timelineItems.first().getByText('E2E Mock').count()) > 0 && (await timelineItems.nth(2).getByText(localFmt('2026-09-03T06:30:00Z')).count()) > 0);
  await page.keyboard.press('Escape');
  await sleep(600);
  // PACK_C 从未更新：留痕空态
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'doc-writer' }), '留痕');
  await page.locator('.n-drawer').getByText('暂无更新留痕').waitFor({ timeout: 5000 });
  h.check('未更新过来源包：留痕空态', true);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-skill E2E');
  });
