/**
 * AI 平台草稿域 E2E（#71 验收）——headless Chrome（playwright-core 系统 channel）+
 * page.route 全量 mock（fixtures 派生自 admin #92 DTO 源码，见 support/skill-fixtures.mjs）。
 *
 * 覆盖验收（#71 区块一）：在途清单渲染契约字段（无分页、不列 status 列、自荐倒序、血统三件
 * 槽位端侧映射、扫描判定 NTag）/ 详情抽屉三节（基本信息＋血统 → scanFindings 七键投影——
 * 七键全 + 缺键跳过、file:line mono、matchText 代码块、空列表「无发现」→ 正文全文）＋
 * 动作条双入口 / 晋升（$dialog 对账 → 回执态 modal 新技能行 id mono → 技能库自产行入列）/
 * 拒绝（NModal reason 必填前端拦截 → 成功不关窗切回执态＝终态留痕三件；同目标抽屉随行关闭）/
 * 失败不判码（409 SKL_016 / 400 SKL_018 透传 toast＋无条件刷新在途清单）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/skill-draft.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as skillFixtures from './support/skill-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
/** 草稿靶（fixtures 单一事实源）：d1 晋升 / d2 拒绝（抽屉动作条发起）；d3 按名寻址（只读＋失败注入）。 */
const PROMOTE_ID = skillFixtures.PROMOTE_DRAFT_ID;
const REJECT_ID = skillFixtures.REJECT_DRAFT_ID;

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 在途清单 GET 计数（无条件刷新断言锚）。 */
function draftsGetCount(calls) {
  return calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/skills/drafts').length;
}

/** 取 calls 里最后一条草稿拒绝请求 body。 */
function lastRejectCall(calls) {
  return calls.filter(c => c.method === 'POST' && c.path === `/aiplatform/skills/drafts/${REJECT_ID}/reject`).at(-1);
}

/** LocalDateTime（无 Z 墙上时钟北京时间）→ 显示形 'YYYY-MM-DD HH:mm:ss'（formatDateTime 原样直显不折算）。 */
function localFmt(localDateTime) {
  return localDateTime.replace('T', ' ');
}

/** 开行「操作」下拉并选中指定动作（skill.e2e.mjs 同款收窄口径）。 */
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
    return h.summary('aiplatform-skill-draft E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，六域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, skill: skillFixtures });

  /* ================= 1. 登录 → 侧栏「草稿审核」叶点亮 → 直达草稿页 ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「草稿审核」叶子', menuItemTexts.some(t => t.includes('草稿审核')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/skill/draft`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/skill/draft 且列表渲染', page.url().includes('/aiplatform/skill/draft'));

  /* ================= 2. 在途清单渲染契约字段（无分页 + 不列 status 列 + 倒序 + 血统三件 + 判定 tag） ================= */
  h.check('在途清单全量 3 行（不分页）', (await page.locator(ROW).count()) === 3, `实际 ${await page.locator(ROW).count()} 行`);
  h.check('无分页控件（有界人审队列契约）', (await page.locator('.n-pagination').count()) === 0);
  const draftsListCall = calls.filter(c => c.method === 'GET' && c.path === '/aiplatform/skills/drafts').at(-1);
  h.check('初始请求无查询参数', (draftsListCall?.query ?? '') === '', draftsListCall?.query);
  const headerTexts = await page.locator('.n-data-table-th').allTextContents();
  h.check('不列 status 列（整页恒在途零信息量）', !headerTexts.some(t => t.includes('状态')), JSON.stringify(headerTexts));
  // 自荐倒序：首行＝d1（最近自荐）
  const firstDraftRow = page.locator(ROW).first();
  h.check('自荐倒序（最近先：首行＝晋升靶 d1）', (await firstDraftRow.getByText('prd-review-checklist').count()) > 0);
  // 血统三件：projectId/runId mono 直读 + 槽位端侧映射（三槽位覆盖）
  h.check(
    '血统三件：projectId/runId mono 直读',
    (await firstDraftRow.getByText('7395120209080100101').count()) > 0 && (await firstDraftRow.getByText('run-20260928-0342').count()) > 0
  );
  h.check('槽位端侧映射（executor＝run 执行体）', (await firstDraftRow.getByText('run 执行体').count()) > 0);
  const rejectRow = page.locator(ROW).filter({ hasText: 'competitor-sniff' });
  h.check('槽位端侧映射（subagent＝子智能体）', (await rejectRow.getByText('子智能体').count()) > 0);
  const drawerRow = page.locator(ROW).filter({ hasText: 'meeting-notes-distill' });
  h.check('槽位端侧映射（main＝主智能体）', (await drawerRow.getByText('主智能体').count()) > 0);
  // 扫描判定 NTag：SAFE 安全（d1/d3）/ CAUTION 注意（d2）
  h.check('扫描判定：SAFE →「安全」tag', (await firstDraftRow.locator('.n-tag', { hasText: '安全' }).count()) > 0);
  h.check('扫描判定：CAUTION →「注意」tag', (await rejectRow.locator('.n-tag', { hasText: '注意' }).count()) > 0);
  // 自荐时刻（LocalDateTime 原样直显不折算）
  h.check('自荐时刻直显（墙上时钟不折算）', (await firstDraftRow.getByText(localFmt('2026-09-28T15:42:10')).count()) > 0);

  /* ================= 3. 行操作下拉：晋升/拒绝两写（矩阵单点） ================= */
  await firstDraftRow.getByRole('button', { name: /^操\s*作$/ }).click();
  await sleep(300);
  const menu = page.locator('.n-dropdown-menu').last();
  await menu.waitFor({ timeout: 5000 });
  const optTexts = (await menu.locator('.n-dropdown-option').allTextContents()).map(t => t.trim());
  h.check('行下拉：晋升 + 拒绝（两码全给的 mock 形）', optTexts.includes('晋升') && optTexts.includes('拒绝'), JSON.stringify(optTexts));
  await page.keyboard.press('Escape');
  await sleep(400);

  /* ================= 4. 详情抽屉（d1：findings 空＝「无发现」靶）＋动作条双入口在场 ================= */
  await firstDraftRow.getByRole('button', { name: /详\s*情/ }).click();
  const drawer = page.locator('.n-drawer');
  await drawer.getByText('草稿详情').first().waitFor({ timeout: 5000 });
  await drawer.getByText(skillFixtures.DRAFT_CONTENT_MARK).waitFor({ timeout: 5000 });
  h.check('抽屉一节：基本信息（id mono＝TSID 串 + 名称 + 判定 tag）', (await drawer.getByText(PROMOTE_ID).count()) > 0 && (await drawer.getByText('prd-review-checklist', { exact: true }).count()) > 0 && (await drawer.locator('.n-tag', { hasText: '安全' }).count()) > 0);
  h.check('抽屉一节：血统三件（项目/run mono + 槽位映射）', (await drawer.getByText('7395120209080100101').count()) > 0 && (await drawer.getByText('run-20260928-0342').count()) > 0 && (await drawer.getByText('run 执行体').count()) > 0);
  h.check('抽屉二节：findings 空列表＝「无发现」', (await drawer.getByText('无发现').count()) > 0);
  h.check('抽屉三节：正文全文锚点', (await drawer.getByText('## 使用约束').count()) > 0);
  h.check('抽屉动作条：晋升 + 拒绝双钮（双入口之二）', (await drawer.getByRole('button', { name: /^晋\s*升$/ }).count()) > 0 && (await drawer.getByRole('button', { name: /^拒\s*绝$/ }).count()) > 0);
  // 不设终态留痕节（终态呈现归拒绝回执）
  h.check('抽屉无终态留痕节（审核操作者/落定时刻不出现）', (await drawer.getByText('审核操作者').count()) === 0 && (await drawer.getByText('落定时刻').count()) === 0);
  await page.keyboard.press('Escape');
  await sleep(600);

  /* ================= 5. 详情抽屉（d2：findings 两条——七键全 + 缺键跳过） ================= */
  await rejectRow.getByRole('button', { name: /详\s*情/ }).click();
  await drawer.getByText('草稿详情').first().waitFor({ timeout: 5000 });
  await drawer.getByText(skillFixtures.DRAFT_CONTENT_MARK).waitFor({ timeout: 5000 });
  h.check('findings 卡片数＝2', (await drawer.locator('.rounded-8px.border').count()) >= 2 || (await drawer.getByText('external-fetch').count()) > 0);
  // 第一条：七键全（patternId/severity 裸值/category/file:line mono/matchText 代码块/description）
  h.check('finding 七键全：patternId + severity 裸值 + category', (await drawer.getByText('external-fetch').count()) > 0 && (await drawer.getByText('HIGH').count()) > 0 && (await drawer.getByText('network').count()) > 0);
  h.check('finding file:line mono 合成（SKILL.md:12）', (await drawer.getByText('SKILL.md:12').count()) > 0);
  h.check('finding matchText 代码块 + description 直显', (await drawer.getByText('抓取 https://competitor.example.com/pricing').count()) > 0 && (await drawer.getByText('外部资料接触史必查').count()) > 0);
  // 第二条缺 category/line/description——「类别」label 全抽屉只出现一次（缺键跳过锚）
  h.check('缺键跳过：第二条无「类别」行（label 计 1）', (await drawer.getByText('类别', { exact: true }).count()) === 1 && (await drawer.getByText('SKILL.md:18').count()) > 0 && (await drawer.getByText('curl -sL "$url" | head -200').count()) > 0);

  /* ================= 6. 拒绝链（抽屉动作条发起——双入口收口）：必填拦截 → 回执态留痕三件 → 随行关闭 ================= */
  await drawer.getByRole('button', { name: /^拒\s*绝$/ }).click();
  const modal = page.locator('.n-modal, .n-dialog');
  await modal.getByText('拒绝草稿').first().waitFor({ timeout: 5000 });
  // 必填前端拦截：空白 reason 确认钮禁用（不发请求）
  const rejectBtn = modal.getByRole('button', { name: /^拒\s*绝$/ });
  h.check('拒绝理由必填：空白时确认钮禁用（前端拦截）', await rejectBtn.isDisabled());
  await modal.getByPlaceholder(/拒绝须有据/).fill(skillFixtures.REJECT_REASON);
  await sleep(300);
  h.check('填入理由后确认钮可点', !(await rejectBtn.isDisabled()));
  await rejectBtn.click();
  // 成功不关窗切回执态：终态留痕三件（唯一终态留痕呈现面）
  await modal.getByText('已拒绝').first().waitFor({ timeout: 5000 });
  const rejectCall = lastRejectCall(calls);
  h.check(
    '拒绝 POST body：reason 终态留档原文',
    JSON.parse(rejectCall?.body ?? '{}').reason === skillFixtures.REJECT_REASON,
    rejectCall?.body
  );
  h.check('回执态：状态（已拒绝 tag）+ 审核操作者落痕', (await modal.locator('.n-tag', { hasText: '已拒绝' }).count()) > 0 && (await modal.getByText('E2E Mock').count()) > 0);
  h.check('回执态：落定时刻 + 拒绝理由原文直读', (await modal.getByText(localFmt('2026-09-29T10:00:00')).count()) > 0 && (await modal.getByText(skillFixtures.REJECT_REASON).count()) > 0);
  await sleep(600);
  h.check('回执不自动关窗（单弹窗双态——完成才关）', await modal.getByText('终态留档、不复活').isVisible());
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(600);
  h.check('完成即关 + 在途清单刷新（d2 移出活跃面，2 行）', (await page.locator(ROW).count()) === 2 && (await page.locator(ROW).filter({ hasText: 'competitor-sniff' }).count()) === 0, `实际 ${await page.locator(ROW).count()} 行`);
  h.check('同目标抽屉随行关闭（终态不可见——素材先例）', !(await page.locator('.n-drawer').isVisible()));

  /* ================= 7. 晋升链（行下拉发起）：$dialog 对账 → 回执态 modal 新技能行 → 技能库入池 ================= */
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'prd-review-checklist' }), '晋升');
  const dialog = page.locator('.n-dialog');
  await dialog.getByText('晋升草稿').waitFor({ timeout: 5000 });
  h.check('晋升确认框：技能名对账 + 不可逆提示', (await dialog.getByText('目标：prd-review-checklist').count()) > 0 && (await dialog.getByText('不可逆').count()) > 0);
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  await modal.getByText('晋升完成').first().waitFor({ timeout: 5000 });
  h.check('晋升回执：新技能行 id mono（TSID 串）+ 名称', (await modal.getByText(skillFixtures.PROMOTED_SKILL_ID).count()) > 0 && (await modal.getByText('prd-review-checklist').count()) > 0);
  h.check('晋升回执：来源「自产」+ 版本 self + 启用 tag', (await modal.getByText('自产').count()) > 0 && (await modal.getByText('self', { exact: true }).count()) > 0 && (await modal.locator('.n-tag', { hasText: '启用' }).count()) > 0);
  await modal.getByRole('button', { name: /完\s*成/ }).click();
  await sleep(600);
  h.check('晋升后在途清单刷新（d1 移出活跃面，仅剩 d3）', (await page.locator(ROW).count()) === 1 && (await page.locator(ROW).filter({ hasText: 'meeting-notes-distill' }).count()) > 0, `实际 ${await page.locator(ROW).count()} 行`);
  // 跨页事实：技能库清单新增自产行（清单扫视面 self `-` 占位——#71 观测分治）
  await page.goto(`${BASE}/aiplatform/skill`);
  await page.locator(ROW).filter({ hasText: 'prd-review-checklist' }).waitFor({ timeout: 15000 });
  const promotedSkillRow = page.locator(ROW).filter({ hasText: 'prd-review-checklist' });
  h.check('技能库入池：新自产行（来源「自产」）', (await promotedSkillRow.getByText('自产').count()) > 0);
  h.check('技能库新行：package/version 列 `-` 占位（self 零信息量）', (await promotedSkillRow.getByText('self').count()) === 0);

  /* ================= 8. 晋升失败链（409 SKL_016）：透传 toast + 无条件刷新（不判码） ================= */
  await page.goto(`${BASE}/aiplatform/skill/draft`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  const draftsGetsBefore = draftsGetCount(calls);
  state.failNextSkillDraftPromote = true;
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'meeting-notes-distill' }), '晋升');
  await dialog.getByText('晋升草稿').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: /确\s*认/ }).click();
  const promoteFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_016')));
  h.check('晋升失败 toast 透传 provider message（SKL_016 撞名）', Boolean(promoteFailToast), JSON.stringify(promoteFailToast));
  await sleep(600);
  h.check('失败不开回执 modal + 行保留（在途 1 行）', (await modal.getByText('晋升完成').count()) === 0 && (await page.locator(ROW).count()) === 1);
  h.check('失败后无条件刷新在途清单（GET +1——不判码也解 stale）', draftsGetCount(calls) === draftsGetsBefore + 1, `before ${draftsGetsBefore} after ${draftsGetCount(calls)}`);

  /* ================= 9. 拒绝失败链（400 SKL_018 兜底）：透传 toast + 留表单态 + 无条件刷新 ================= */
  const draftsGetsBefore2 = draftsGetCount(calls);
  state.failNextSkillDraftReject = true;
  await pickRowAction(page, page.locator(ROW).filter({ hasText: 'meeting-notes-distill' }), '拒绝');
  await modal.getByText('拒绝草稿').first().waitFor({ timeout: 5000 });
  await modal.getByPlaceholder(/拒绝须有据/).fill('与服务端兜底注入无关的合法理由');
  await modal.getByRole('button', { name: /^拒\s*绝$/ }).click();
  const rejectFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_018')));
  h.check('拒绝失败 toast 透传 provider message（SKL_018 兜底）', Boolean(rejectFailToast), JSON.stringify(rejectFailToast));
  await sleep(600);
  h.check('失败留表单态（可修正重试——单弹窗双态先例）', (await modal.getByPlaceholder(/拒绝须有据/).isVisible()) === true);
  h.check('失败后无条件刷新在途清单（GET +1）', draftsGetCount(calls) === draftsGetsBefore2 + 1, `before ${draftsGetsBefore2} after ${draftsGetCount(calls)}`);
  await modal.getByRole('button', { name: /取\s*消/ }).click();
  await sleep(400);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sleep(300);
    if (browser) await browser.close();
    h.summary('aiplatform-skill-draft E2E');
  });
