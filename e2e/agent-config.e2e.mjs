/**
 * AI 平台智能体配置 E2E（#69 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 见 support/skill-fixtures.mjs；配置态=AGENT_CONFIGS、
 * 留痕=AGENT_TRACES、工具面=AGENT_TOOL_SLOTS——main 槽增强件挂载态由 harness 按 main 配置
 * flag 派生，同源不漂移）。
 *
 * 覆盖验收（#69 八条）：两座编辑卡（systemPrompt NTextarea＋modelId NInput 手输＋覆盖标记
 * 「已覆盖/默认」＋默认值灰字预览）/ 保存 PUT 四字段全量回传（webSearch/fetchUrl 以 GET 回显
 * 原值透传——防静默误开；清空字段提交＝回落默认、覆盖标记复位）/ 留痕时间线（倒序、只渲染
 * old≠new 变化项、null 显「（默认）」、operatorName＋operatedAt）/ 回滚（$dialog.warning 确认→
 * PUT old 四值写回＝一次新变更留新痕→toast＋双卡刷新）/ 工具面三槽位块（slotName 直读＋kind
 * 端侧三值映射＋骨架/内建 disabled 恒开）/ 增强工具受控开关即时 PUT＋失败回滚＋toast /
 * 失败透传 toast（400 PRJ_034 配置写 / 403 PRJ_036 工具开关两代表样）/ route+i18n（菜单叶 240
 * 「智能体配置」）。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/agent-config.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as skillFixtures from './support/skill-fixtures.mjs';

const BASE = 'http://localhost:3001';
/** 断言靶（fixtures 单一事实源）：main＝双覆盖靶（fetchUrl 关＝flag 透传断言锚）/ executor＝全默认靶。 */
const OVERRIDE_PROMPT = skillFixtures.MAIN_OVERRIDE_PROMPT;
const DEFAULT_PROMPT = skillFixtures.MAIN_DEFAULT_PROMPT;
const OVERRIDE_MODEL = skillFixtures.MAIN_OVERRIDE_MODEL;
const NEW_MODEL = 'deepseek-v4-ultra';

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** calls 里指定座配置读面（GET）请求数（回读刷新断言锚）。 */
function configGetCount(calls, key) {
  return calls.filter(c => c.method === 'GET' && c.path === `/aiplatform/agent-configs/${key}`).length;
}

/** calls 里指定座配置写（PUT）最后一条 body 解析。 */
function lastConfigPut(calls, key) {
  const call = calls.filter(c => c.method === 'PUT' && c.path === `/aiplatform/agent-configs/${key}`).at(-1);
  return call ? JSON.parse(call.body ?? '{}') : null;
}

/** calls 里工具开关写（PUT /agent-tools/{name}）最后一条 body 解析。 */
function lastToolPut(calls, toolName) {
  const call = calls.filter(c => c.method === 'PUT' && c.path === `/aiplatform/agent-tools/${toolName}`).at(-1);
  return call ? JSON.parse(call.body ?? '{}') : null;
}

/** 留痕时间线条目数。 */
async function traceCount(page) {
  return page.locator('.n-timeline-item').count();
}

/** 首条留痕（最近先——服务端倒序）文本。 */
async function newestTraceText(page) {
  return page.locator('.n-timeline-item').first().textContent();
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-agent-config E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，六域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, skill: skillFixtures });

  /* ================= 1. 登录 → 菜单「智能体配置」叶子（240）→ 直达配置页（main 座进入即加载） ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「智能体配置」叶子（动态菜单 240）', menuItemTexts.some(t => t.includes('智能体配置')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/agent-config`);
  await page.locator('.n-timeline-item').first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/agent-config 且 main 座读面渲染', page.url().includes('/aiplatform/agent-config'));
  h.check('进入即加载 GET /agent-configs/main ＋ /traces', configGetCount(calls, 'main') >= 1);

  /* ================= 2. main 编辑卡：覆盖标记＋默认预览＋生效值预填 ================= */
  const tabTexts = await page.locator('.n-tabs-tab').allTextContents();
  h.check(
    '三签 label：主智能体 / run 执行体 / 工具面',
    ['主智能体', 'run 执行体', '工具面'].every(label => tabTexts.some(t => t.includes(label))),
    JSON.stringify(tabTexts)
  );
  const promptTextarea = page.locator('textarea').first();
  h.check('systemPrompt 预填＝生效值（覆盖态＝覆盖 prompt）', (await promptTextarea.inputValue()) === OVERRIDE_PROMPT);
  const modelInput = page.getByPlaceholder('模型档位裸名');
  h.check('modelId 预填＝生效值（deepseek-v4-max）', (await modelInput.inputValue()) === OVERRIDE_MODEL);
  const editCardText = await page.locator('.n-card').first().textContent();
  h.check(
    '覆盖标记「已覆盖」×2（systemPrompt＋modelId）＋默认值灰字预览（默认 prompt＋默认档 flash）',
    (editCardText.match(/已覆盖/g) ?? []).length === 2 &&
      editCardText.includes(DEFAULT_PROMPT.slice(0, 18)) &&
      editCardText.includes('deepseek-v4-flash'),
    editCardText.slice(0, 120)
  );
  h.check('最近写者留痕行（operatorName 直读）', editCardText.includes('运营·技能管理员'));
  h.check('保存钮在（agent-config:update 权限码门控下渲染）', (await page.getByRole('button', { name: /保存配置/ }).count()) === 1);

  /* ================= 3. 留痕时间线初始态：倒序＋只渲染变化项＋null 显（默认） ================= */
  h.check('main 留痕 2 条（倒序＝最近先）', (await traceCount(page)) === 2, `实际 ${await traceCount(page)} 条`);
  const newestText = await newestTraceText(page);
  h.check(
    '最新痕只渲染变化项（仅 网页抓取：开→关；系统提示词/模型档位/联网搜索不显）',
    newestText.includes('网页抓取') && newestText.includes('开') && newestText.includes('关') &&
      !newestText.includes('系统提示词') && !newestText.includes('模型档位') && !newestText.includes('联网搜索'),
    newestText ?? ''
  );
  const oldestText = await page.locator('.n-timeline-item').last().textContent();
  h.check(
    '最旧痕双字段变化＋null 显「（默认）」（prompt/modelId （默认）→覆盖值；两 flag 未动不显）',
    oldestText.includes('（默认）') && oldestText.includes(OVERRIDE_PROMPT.slice(0, 14)) &&
      !oldestText.includes('联网搜索') && !oldestText.includes('网页抓取'),
    oldestText ?? ''
  );
  h.check('条目带操作者（operatorName 直读）', oldestText.includes('王建设'));
  h.check('条目「回滚」钮在（update 码门控下渲染）', (await page.locator('.n-timeline-item .n-button', { hasText: '回滚' }).count()) === 2);

  /* ================= 4. 保存失败注入：400 PRJ_034 透传 toast、表单保留 ================= */
  const mainGetsBeforeSave = configGetCount(calls, 'main');
  await modelInput.fill(NEW_MODEL);
  state.failNextAgentConfigUpdate = true;
  await page.getByRole('button', { name: /保存配置/ }).click();
  const failToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('PRJ_034')));
  h.check('保存失败 toast 透传 provider message（PRJ_034）', Boolean(failToast), JSON.stringify(failToast));
  await sleep(600);
  h.check('失败后不回读（表单保留可修正重试）', configGetCount(calls, 'main') === mainGetsBeforeSave && (await modelInput.inputValue()) === NEW_MODEL);

  /* ================= 5. 保存成功：四字段全量回传（flag 原值透传）＋清空回落＋覆盖标记复位 ================= */
  await promptTextarea.fill(''); // 清空 systemPrompt＝清覆盖回落默认
  await page.getByRole('button', { name: /保存配置/ }).click();
  const savedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已保存') && m.includes('主智能体')));
  h.check('保存成功 toast（座名插值）', Boolean(savedToast), JSON.stringify(savedToast));
  const putBody = lastConfigPut(calls, 'main');
  h.check(
    'PUT body 四字段全量回传：systemPrompt 空串＝清覆盖、modelId 新值、两 flag 以 GET 回显原值透传（fetchUrl=false 防静默误开）',
    Boolean(putBody) &&
      putBody.systemPrompt === '' &&
      putBody.modelId === NEW_MODEL &&
      putBody.webSearchEnabled === true &&
      putBody.fetchUrlEnabled === false,
    putBody ? JSON.stringify(putBody) : 'no PUT call'
  );
  await sleep(600);
  h.check('成功后回读刷新（GET config 再入）', configGetCount(calls, 'main') === mainGetsBeforeSave + 1);
  const refreshedCardText = await page.locator('.n-card').first().textContent();
  h.check(
    '清空提交＝回落默认＋覆盖标记复位（prompt＝默认原文、tag「默认」；modelId 保持「已覆盖」）',
    (await promptTextarea.inputValue()) === DEFAULT_PROMPT &&
      (refreshedCardText.match(/已覆盖/g) ?? []).length === 1 &&
      refreshedCardText.includes('默认'),
    `prompt=${(await promptTextarea.inputValue()).slice(0, 18)}… tags=${(refreshedCardText.match(/已覆盖/g) ?? []).length}`
  );
  await sleep(400);
  h.check('留痕新增一条（本次保存＝真实变更落痕，3 条）', (await traceCount(page)) === 3, `实际 ${await traceCount(page)} 条`);
  const saveTraceText = await newestTraceText(page);
  h.check('新痕只渲染变化项（prompt 覆盖值→（默认）＋modelId 新旧；两 flag 未动不显）', saveTraceText.includes('（默认）') && saveTraceText.includes(NEW_MODEL) && !saveTraceText.includes('联网搜索'), saveTraceText ?? '');

  /* ================= 6. executor 座：全默认靶（无覆盖行）＋留痕空态 ================= */
  await page.locator('.n-tabs-tab').filter({ hasText: 'run 执行体' }).click();
  await page.locator('textarea').first().waitFor({ timeout: 10000 });
  await sleep(600);
  h.check('切签加载 GET /agent-configs/executor', configGetCount(calls, 'executor') >= 1);
  const execCardText = await page.locator('.n-card').first().textContent();
  h.check(
    'executor 全默认：生效值＝默认原文、覆盖标记「默认」×2、无最近写者行',
    (await page.locator('textarea').first().inputValue()) === skillFixtures.EXECUTOR_DEFAULT_PROMPT &&
      (await page.locator('.n-tag', { hasText: '默认' }).count()) === 2 &&
      !execCardText.includes('最近写者'),
    execCardText.slice(0, 120)
  );
  h.check('executor 留痕空态', (await traceCount(page)) === 0 && (await page.locator('text=暂无变更留痕').count()) === 1);

  /* ================= 7. 回 main 座回滚：$dialog.warning → PUT old 四值写回＝留新痕 ================= */
  await page.locator('.n-tabs-tab').filter({ hasText: '主智能体' }).click();
  await page.locator('.n-timeline-item').first().waitFor({ timeout: 10000 });
  await sleep(600);
  h.check('回签重挂回读（GET 再入，痕 3 条＝初始 2＋保存 1）', (await traceCount(page)) === 3, `实际 ${await traceCount(page)} 条`);
  await page.locator('.n-timeline-item').first().locator('.n-button', { hasText: '回滚' }).click();
  await sleep(300);
  h.check('回滚二次确认弹窗（$dialog.warning）', (await page.locator('.n-dialog').count()) === 1);
  await page.locator('.n-dialog').getByRole('button', { name: /确\s*认/ }).click();
  const rollbackToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已回滚')));
  h.check('回滚成功 toast（旧值已写回）', Boolean(rollbackToast), JSON.stringify(rollbackToast));
  const rollbackBody = lastConfigPut(calls, 'main');
  h.check(
    '回滚 PUT body＝该次变更前 old 四值快照（prompt 覆盖值＋modelId 旧值＋两 flag 原值）',
    Boolean(rollbackBody) &&
      rollbackBody.systemPrompt === OVERRIDE_PROMPT &&
      rollbackBody.modelId === OVERRIDE_MODEL &&
      rollbackBody.webSearchEnabled === true &&
      rollbackBody.fetchUrlEnabled === false,
    rollbackBody ? JSON.stringify({ ...rollbackBody, systemPrompt: rollbackBody.systemPrompt?.slice(0, 18) }) : 'no PUT call'
  );
  await sleep(600);
  h.check('回滚后编辑卡刷新（prompt 复覆盖态＋「已覆盖」×2）', (await page.locator('textarea').first().inputValue()) === OVERRIDE_PROMPT && ((await page.locator('.n-card').first().textContent()).match(/已覆盖/g) ?? []).length === 2);
  h.check('回滚＝一次新变更留新痕（4 条）', (await traceCount(page)) === 4, `实际 ${await traceCount(page)} 条`);

  /* ================= 8. 工具面签：三槽位块＋kind 三值映射＋骨架/内建 disabled 恒开 ================= */
  await page.locator('.n-tabs-tab').filter({ hasText: '工具面' }).click();
  await page.locator('.n-data-table-tbody .n-data-table-tr').first().waitFor({ timeout: 15000 });
  await sleep(600);
  const blockTitles = await page.locator('.n-card .n-card-header__main').allTextContents();
  h.check('三槽位块题 slotName 直读（主智能体/run 执行体/子智能体）', ['主智能体', 'run 执行体', '子智能体'].every(t => blockTitles.some(b => b.includes(t))), JSON.stringify(blockTitles));
  const bodyText = await page.locator('.n-card').first().textContent();
  h.check('kind tag 端侧三值映射（骨架/增强/内建）', bodyText.includes('骨架') && bodyText.includes('增强') && bodyText.includes('内建'));
  // 工具名全局唯一（ask_user/web_search/fetch_url 仅 main 槽）——页级行定位即可
  const skeletonRow = page.locator('.n-data-table-tr').filter({ hasText: 'ask_user' });
  h.check('骨架行 switch disabled 恒开', (await skeletonRow.locator('.n-switch--disabled.n-switch--active').count()) === 1);
  const webSearchRow = page.locator('.n-data-table-tr').filter({ hasText: 'web_search' });
  const fetchUrlRow = page.locator('.n-data-table-tr').filter({ hasText: 'fetch_url' });
  h.check(
    '增强件挂载态＝main 配置 flag 同源（web_search 开 / fetch_url 关——回滚后原值）',
    (await webSearchRow.locator('.n-switch--active').count()) === 1 && (await fetchUrlRow.locator('.n-switch--active').count()) === 0
  );
  h.check('增强行 switch 可操作（toggle 码门控下 enabled）', (await fetchUrlRow.locator('.n-switch:not(.n-switch--disabled)').count()) === 1);

  /* ================= 9. 增强工具即时开关：PUT {enabled} → toast＋清单回读 ================= */
  await fetchUrlRow.locator('.n-switch').click();
  const toggleToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('fetch_url') && m.includes('开启')));
  h.check('开关成功 toast（工具名＋目标态）', Boolean(toggleToast), JSON.stringify(toggleToast));
  const toggleBody = lastToolPut(calls, 'fetch_url');
  h.check('开关 PUT body＝{enabled:true}（受控即时写、无确认弹窗）', Boolean(toggleBody) && toggleBody.enabled === true, JSON.stringify(toggleBody));
  await sleep(600);
  h.check('成功后清单回读（开关视觉态＝新事实）', (await fetchUrlRow.locator('.n-switch--active').count()) === 1);

  /* ================= 10. 开关失败注入：403 PRJ_036 透传＋受控值回滚（视觉态不动） ================= */
  state.failNextAgentToolToggle = true;
  await webSearchRow.locator('.n-switch').click(); // 当前开→点关（发起 PUT enabled:false）
  const toggleFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('PRJ_036')));
  h.check('开关失败 toast 透传 provider message（PRJ_036）', Boolean(toggleFailToast), JSON.stringify(toggleFailToast));
  await sleep(600);
  h.check('失败回滚：受控开关视觉态不动（web_search 仍开）', (await webSearchRow.locator('.n-switch--active').count()) === 1);
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-agent-config E2E');
  });
