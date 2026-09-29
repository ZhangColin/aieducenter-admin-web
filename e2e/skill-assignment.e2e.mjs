/**
 * AI 平台指派配置 E2E（#68 验收）——headless Chrome（playwright-core 系统 channel，免下载浏览器）
 * + page.route 全量 mock（fixtures 见 support/skill-fixtures.mjs；选项源=技能清单、指派态=SKILL_ASSIGNMENTS）。
 *
 * 覆盖验收（#68 七条）：三签 label 端侧映射（main=主智能体/executor=run 执行体/subagent=子智能体——
 * 响应无 slotName）＋切签/进入加载对应 GET 预填 / 选项表不列 builtin＋行上下文列取自技能清单＋
 * 停用行可勾与状态 warning tag（终态语义：停用不解除指派）/ 保存＝直接 PUT {skillIds[]}＋toast 无
 * 确认弹窗、空勾选＝清空、成功后回读刷新 / assign 权限码门控保存钮（全量权限下按钮在）/
 * 失败透传 message toast（400 SKL_011 注入代表样）/ 空选项集引导（零安装行 → NEmpty＋跳技能管理，
 * 无裸空表无保存钮——#68 空态实录：选项集空时「怎么指派」无从下手）。
 * #72 预检三态（spec #73 grill Q1–Q7）：手动预检钮（空清单禁用/loading 态/POST body＝点击时快照）/
 * overlap 逐条四字段＋null「—」占位 / 非阻断（hints 非空保存照常 PUT、预检失败不阻塞指派）/
 * stale 保留＋标注＋复原消解 / 再预检清旧＋notExecuted 降级态不伪装成无重叠（红线）/
 * clean 确认无重叠 / 切签结果随面板丢弃。
 *
 * 前置：dev server 跑在 :3001（`pnpm dev`）。运行：`node e2e/skill-assignment.e2e.mjs`。
 */
import { chromium } from 'playwright-core';
import { createHarness, installAiplatformMocks, sleep, waitForMessage } from './support/harness.mjs';
import * as orderFixtures from './support/order-fixtures.mjs';
import * as skillFixtures from './support/skill-fixtures.mjs';

const BASE = 'http://localhost:3001';
const ROW = '.n-data-table-tbody .n-data-table-tr';
/** PUT body 断言靶（fixtures 单一事实源）：预填勾 = pdf-export(停用呈现靶 csv-analyzer 同签) / 清空靶 seo-audit / 空签靶 doc-writer。 */
const ENABLE_ID = skillFixtures.ENABLE_ID;
const REMOVED_ID = skillFixtures.REMOVED_ID;
const EMPTY_SLOT_ROW_ID = skillFixtures.EMPTY_SLOT_ROW_ID;

const h = createHarness();

/** 浏览器引用提升（main 的 finally 要收口关闭；不关闭会挂住 node 事件循环）。 */
let browser = null;

/** 取 calls 里指定槽位指派读面（GET）请求数。 */
function assignmentGetCount(calls, slot) {
  return calls.filter(c => c.method === 'GET' && c.path === `/aiplatform/skills/assignments/${slot}`).length;
}

/** 取 calls 里指定槽位指派写（PUT）最后一条 body 解析。 */
function lastAssignPut(calls, slot) {
  const call = calls.filter(c => c.method === 'PUT' && c.path === `/aiplatform/skills/assignments/${slot}`).at(-1);
  return call ? JSON.parse(call.body ?? '{}') : null;
}

/** 行勾选态（selection 列 checkbox 的 checked 类）。 */
async function rowChecked(row) {
  return (await row.locator('.n-checkbox--checked').count()) > 0;
}

/** 勾/取消勾一行（点击行内 checkbox toggle）。 */
async function toggleRow(row) {
  await row.locator('.n-checkbox').first().click();
  await sleep(300);
}

/** NAlert 三态视觉差异化（Naive type 不落 DOM class、走 cssVars 着色——NTag 同款坑：以 computed
 *  背景色差异化断言，不锚定主题具体色值，仅证 warning/success/info 三态视觉互异）。 */
async function alertBg(page) {
  return page.locator('.n-alert').first().evaluate(el => getComputedStyle(el).backgroundColor);
}

async function main() {
  // ---- 前置：dev server 须在 :3001（CORS 只放行 3001，残留旧 server 会顺延 3002） ----
  try {
    const res = await fetch(BASE);
    h.check('dev server :3001 可访问', res.ok);
  } catch {
    h.check('dev server :3001 可访问', false, '先跑 pnpm dev（端口必须落 3001）');
    return h.summary('aiplatform-skill-assignment E2E');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.split('\n')[0]));

  // order fixtures 一并挂载：menus mock 的 home=aiplatform_order（不挂撞 benign 空成功，六域先例）
  const { calls, state } = await installAiplatformMocks(page, { order: orderFixtures, skill: skillFixtures });

  /* ================= 1. 登录 → 菜单「指派配置」叶子 → 直达指派页（main 签进入即加载） ================= */
  await page.goto(`${BASE}/auth/login`);
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('Hcy@2026');
  await page.getByRole('button', { name: /确\s*认/ }).click();
  await page.waitForURL(/aiplatform\/order/, { timeout: 15000 });
  await page.locator('[role=menuitem], [role=treeitem]').first().waitFor({ timeout: 10000 });
  const menuItemTexts = await page.locator('[role=menuitem], [role=treeitem]').allTextContents();
  h.check('侧栏渲染「指派配置」叶子（动态菜单 230）', menuItemTexts.some(t => t.includes('指派配置')));
  // 菜单→路由跳转与 addRoute 时序竞态（#58 坑与定案）——直达 URL 规避
  await page.goto(`${BASE}/aiplatform/skill-assignment`);
  await page.locator(ROW).first().waitFor({ timeout: 15000 });
  h.check('落 /aiplatform/skill-assignment 且选项表渲染', page.url().includes('/aiplatform/skill-assignment'));

  /* ================= 2. 三签 label 端侧映射（响应无 slotName） ================= */
  const tabTexts = await page.locator('.n-tabs-tab').allTextContents();
  h.check(
    '三签 label 端侧映射：主智能体 / run 执行体 / 子智能体',
    ['主智能体', 'run 执行体', '子智能体'].every(label => tabTexts.some(t => t.includes(label))),
    JSON.stringify(tabTexts)
  );

  /* ================= 3. 选项表不列 builtin（门控可达即排除）＋行上下文列 ================= */
  const rowCount = await page.locator(ROW).count();
  h.check('选项表 5 行＝安装行全量（builtin 不列）', rowCount === 5, `实际 ${rowCount} 行`);
  const rowTexts = await page.locator(ROW).allTextContents();
  h.check('无内置来源行（builtin: 三行不入选项集）', rowTexts.every(t => !t.includes('内置')), JSON.stringify(rowTexts));
  const contextRow = page.locator(ROW).filter({ hasText: 'pdf-export' });
  h.check('行上下文列取自技能清单（名称/描述/来源/状态）', (await contextRow.getByText('将项目交付文档导出为 PDF').count()) > 0 && (await contextRow.getByText('安装').count()) > 0 && (await contextRow.locator('.n-tag', { hasText: '启用' }).count()) > 0);

  /* ================= 4. main 签进入即加载 GET 预填；停用行照常预勾＋warning tag ================= */
  await sleep(600);
  h.check('进入即加载 GET /skills/assignments/main（预填源）', assignmentGetCount(calls, 'main') >= 1);
  const pdfRow = page.locator(ROW).filter({ hasText: 'pdf-export' });
  const csvRow = page.locator(ROW).filter({ hasText: 'csv-analyzer' });
  const sqlRow = page.locator(ROW).filter({ hasText: 'sql-helper' });
  h.check('main 预填：pdf-export + csv-analyzer 预勾（GET skills[].id）', (await rowChecked(pdfRow)) && (await rowChecked(csvRow)));
  h.check('main 预填：未指派行不勾（sql-helper）', !(await rowChecked(sqlRow)));
  // 停用行＝指派了但已停用（装配退化警示）：状态 tag 以警示色呈现（Naive tag type 不落 DOM class，
  // 走 cssVars 着色——以 computed 背景色差异化断言，不锚定主题具体色值）
  const statusTagColor = async row => row.locator('.n-tag').first().evaluate(el => getComputedStyle(el).backgroundColor);
  const csvTagColor = await statusTagColor(csvRow);
  const pdfTagColor = await statusTagColor(pdfRow);
  h.check(
    '停用指派行：状态 tag 警示色呈现「指派了但已停用」实态（区别于启用行）',
    (await csvRow.locator('.n-tag', { hasText: '停用' }).count()) > 0 && csvTagColor !== pdfTagColor,
    `csv=${csvTagColor} pdf=${pdfTagColor}`
  );

  /* ================= 5. 增减保存：直接 PUT 整包（无确认弹窗）＋toast＋回读刷新 ================= */
  const mainGetsBefore = assignmentGetCount(calls, 'main');
  await toggleRow(pdfRow); // 取消 pdf-export
  await toggleRow(sqlRow); // 新勾 sql-helper
  h.check('保存钮在（assign 权限码门控下渲染）', (await page.getByRole('button', { name: /保\s*存/ }).count()) === 1);
  await page.getByRole('button', { name: /保\s*存/ }).click();
  const savedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已保存')));
  h.check('保存成功 toast（槽位名插值）', Boolean(savedToast) && savedToast.some(m => m.includes('主智能体')), JSON.stringify(savedToast));
  h.check('保存无确认弹窗（直接 PUT）', (await page.locator('.n-dialog').count()) === 0);
  const putBody = lastAssignPut(calls, 'main');
  h.check(
    'PUT body：整包替换 {skillIds[]}（取消 pdf-export + 新勾 sql-helper，csv-analyzer 保留）',
    Boolean(putBody) && JSON.stringify([...(putBody.skillIds ?? [])].sort()) === JSON.stringify([ENABLE_ID, REMOVED_ID].sort()),
    putBody ? JSON.stringify(putBody) : 'no PUT call'
  );
  await sleep(600);
  h.check('成功后回读刷新（GET assignments/main 再入）', assignmentGetCount(calls, 'main') === mainGetsBefore + 1);
  h.check('回读后勾选态＝新终态（csv-analyzer+sql-helper 勾、pdf-export 不勾）', (await rowChecked(csvRow)) && (await rowChecked(sqlRow)) && !(await rowChecked(pdfRow)));

  /* ================= 6. 切签 executor：加载对应 GET 预填 → 清空保存（空勾选＝清空指派） ================= */
  await page.locator('.n-tabs-tab').filter({ hasText: 'run 执行体' }).click();
  await page.locator(ROW).filter({ hasText: 'seo-audit' }).waitFor({ timeout: 10000 });
  await sleep(600);
  h.check('切签加载 GET /skills/assignments/executor', assignmentGetCount(calls, 'executor') >= 1);
  const seoRow = page.locator(ROW).filter({ hasText: 'seo-audit' });
  h.check('executor 预填：seo-audit 预勾', await rowChecked(seoRow));
  const execGetsBefore = assignmentGetCount(calls, 'executor');
  await toggleRow(seoRow); // 取消唯一预勾 → 空勾选
  await page.getByRole('button', { name: /保\s*存/ }).click();
  const clearedToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('已保存')));
  h.check('清空保存成功 toast', Boolean(clearedToast));
  const clearBody = lastAssignPut(calls, 'executor');
  h.check('空勾选保存＝PUT skillIds:[]（清空指派）', Boolean(clearBody) && JSON.stringify(clearBody.skillIds) === '[]', JSON.stringify(clearBody));
  await sleep(600);
  h.check('清空后回读刷新且勾选归零', assignmentGetCount(calls, 'executor') === execGetsBefore + 1 && !(await rowChecked(seoRow)));

  /* ================= 7. 切签 subagent：空预填 → 勾一项保存（空→非空） ================= */
  await page.locator('.n-tabs-tab').filter({ hasText: '子智能体' }).click();
  await page.locator(ROW).filter({ hasText: 'doc-writer' }).waitFor({ timeout: 10000 });
  await sleep(600);
  h.check('切签加载 GET /skills/assignments/subagent', assignmentGetCount(calls, 'subagent') >= 1);
  const docRow = page.locator(ROW).filter({ hasText: 'doc-writer' });
  h.check('subagent 空预填（初始无指派，全不勾）', !(await rowChecked(docRow)));
  await toggleRow(docRow);
  await page.getByRole('button', { name: /保\s*存/ }).click();
  await waitForMessage(page, msgs => msgs.some(m => m.includes('已保存')));
  const subBody = lastAssignPut(calls, 'subagent');
  h.check('空→非空保存：PUT skillIds=[doc-writer id]', Boolean(subBody) && JSON.stringify(subBody.skillIds) === JSON.stringify([EMPTY_SLOT_ROW_ID]), JSON.stringify(subBody));
  await sleep(600);
  h.check('回读后 doc-writer 保持勾选（终态确认）', await rowChecked(docRow));

  /* ================= 8. 失败注入：400 SKL_011 透传 toast（无确认、勾选态保留） ================= */
  state.failNextSkillAssign = true;
  await toggleRow(docRow); // subagent 取消 doc-writer 勾触发下一次 PUT
  await page.getByRole('button', { name: /保\s*存/ }).click();
  const failToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_011')));
  h.check('失败 toast 透传 provider message（SKL_011）', Boolean(failToast), JSON.stringify(failToast));
  await sleep(600);
  h.check('失败后勾选态保留（未回读、可修正重试）', (await rowChecked(docRow)) === false);

  /* ================= 9. 预检（#72）：空清单禁用 → loading 态 → overlap 逐条四字段＋null「—」 ================= */
  // 此刻 subagent 勾选＝[]（上节失败保存保留空勾选）——空清单禁用靶（Q5：判定对象为空不发 15s 调用）
  const precheckBtn = page.getByRole('button', { name: /预\s*检/ });
  h.check('空勾选：预检钮禁用（判定对象为空）', await precheckBtn.isDisabled());
  await toggleRow(docRow); // 勾回 doc-writer → 非空
  h.check('非空勾选：预检钮可点', await precheckBtn.isEnabled());
  // loading 态靶（AC：15s 量级延迟有 loading）——延迟回执下预检钮自身 loading、发起即清旧（此刻本无结果区）
  skillFixtures.SKILL_PRECHECK.delayMs = 1200;
  await precheckBtn.click();
  h.check('预检在途：预检钮 loading 态', (await page.locator('.n-button--loading').count()) === 1);
  await page.locator('.n-alert').first().waitFor({ timeout: 10000 });
  skillFixtures.SKILL_PRECHECK.delayMs = 0;
  const overlapText = await page.locator('.n-alert').first().innerText();
  const overlapBg = await alertBg(page);
  h.check('overlap 态：「发现 2 处方法论重叠」文案', overlapText.includes('发现 2 处方法论重叠'), overlapText);
  h.check(
    'overlap 态：逐条四字段（涉及技能/对照/重叠/消解方向）＋值原文直读',
    ['涉及技能', '对照', '重叠', '消解方向', 'doc-writer、prd-writing', '工作协议', '二选一或收窄 description'].every(t => overlapText.includes(t)),
    overlapText
  );
  h.check('null 容差：三 null 字段「—」占位不臆造兜底（第二条样本）', (overlapText.match(/—/g) ?? []).length === 3, overlapText);
  const precheckPost = calls.filter(c => c.method === 'POST' && c.path === '/aiplatform/skills/assignments/subagent/precheck').at(-1);
  h.check(
    '预检 POST body＝点击时勾选快照 {skillIds[]}',
    Boolean(precheckPost) && JSON.stringify(JSON.parse(precheckPost.body ?? '{}').skillIds) === JSON.stringify([EMPTY_SLOT_ROW_ID]),
    precheckPost?.body ?? 'no POST call'
  );

  /* ================= 10. 预检非阻断：hints 非空下保存照常 PUT（提示是输入不是门） ================= */
  h.check('预检结果在、保存钮照常可点', await page.getByRole('button', { name: /保\s*存/ }).isEnabled());
  await page.getByRole('button', { name: /保\s*存/ }).click();
  await waitForMessage(page, msgs => msgs.some(m => m.includes('已保存')));
  const subPutWithHints = lastAssignPut(calls, 'subagent');
  h.check(
    'hints 非空不拦保存（PUT 照常发出）',
    Boolean(subPutWithHints) && JSON.stringify(subPutWithHints.skillIds) === JSON.stringify([EMPTY_SLOT_ROW_ID])
  );

  /* ================= 11. stale：清单变更旧结果保留＋标注；复原快照标注消解（Q4） ================= */
  await toggleRow(docRow); // 取消勾选 → 清单 ≠ 快照（参照 hints 消解时不抽走参照物）
  await sleep(300);
  const staleText = await page.locator('.n-alert').first().innerText();
  h.check('清单变更：旧结果保留＋「清单已变更」标注', staleText.includes('发现 2 处方法论重叠') && staleText.includes('清单已变更'), staleText);
  await toggleRow(docRow); // 勾回 → 复原快照 → 派生比较自然消解
  await sleep(300);
  h.check('清单复原快照：stale 标注消解', !(await page.locator('.n-alert').first().innerText()).includes('清单已变更'));

  /* ================= 12. 再预检清旧＋notExecuted 降级态（不得伪装成无重叠——红线） ================= */
  skillFixtures.SKILL_PRECHECK.mode = 'notExecuted';
  await precheckBtn.click();
  await sleep(800);
  const notExecutedText = await page.locator('.n-alert').first().innerText();
  const notExecutedBg = await alertBg(page);
  h.check('再预检清旧（overlap 文案不再呈现）', !notExecutedText.includes('发现 2 处'));
  h.check(
    'notExecuted：info 中性「预检未执行」且无「无重叠」文案',
    notExecutedText.includes('预检未执行') && !notExecutedText.includes('未发现方法论重叠'),
    notExecutedText
  );
  h.check('三态视觉互异：notExecuted ≠ overlap（cssVars 背景色）', notExecutedBg !== overlapBg, `${notExecutedBg} vs ${overlapBg}`);

  /* ================= 13. clean 态：确认无重叠（success） ================= */
  skillFixtures.SKILL_PRECHECK.mode = 'clean';
  await precheckBtn.click();
  await sleep(800);
  const cleanText = await page.locator('.n-alert').first().innerText();
  const cleanBg = await alertBg(page);
  h.check('clean 态：success「未发现方法论重叠」', cleanText.includes('未发现方法论重叠'), cleanText);
  h.check('三态视觉互异：clean ≠ overlap ≠ notExecuted（cssVars 背景色）', cleanBg !== overlapBg && cleanBg !== notExecutedBg, `${cleanBg} vs ${overlapBg} / ${notExecutedBg}`);

  /* ================= 14. 预检失败注入：透传 toast＋无结果区＋不阻塞指派（AC） ================= */
  state.failNextSkillPrecheck = true;
  await precheckBtn.click();
  const precheckFailToast = await waitForMessage(page, msgs => msgs.some(m => m.includes('SKL_011')));
  h.check('预检失败：错误族透传 toast（SKL_011——与 PUT 指派同源同码）', Boolean(precheckFailToast));
  await sleep(400);
  h.check('预检失败：无结果区（发起已清旧、不伪装）', (await page.locator('.n-alert').count()) === 0);
  h.check('预检失败不阻塞指派：保存钮照常可点', await page.getByRole('button', { name: /保\s*存/ }).isEnabled());

  /* ================= 15. 切签丢弃：结果随面板卸载（与未保存勾选同命，Q7） ================= */
  await precheckBtn.click(); // clean 态再落一份结果
  await sleep(800);
  await page.locator('.n-tabs-tab').filter({ hasText: 'run 执行体' }).click();
  await page.locator(ROW).filter({ hasText: 'seo-audit' }).waitFor({ timeout: 10000 });
  await page.locator('.n-tabs-tab').filter({ hasText: '子智能体' }).click();
  await page.locator(ROW).filter({ hasText: 'doc-writer' }).waitFor({ timeout: 10000 });
  await sleep(600);
  h.check('切签再回：预检结果随面板丢弃（无 alert）', (await page.locator('.n-alert').count()) === 0);

  /* ================= 16. 空选项集引导：零安装行 → NEmpty＋跳技能管理（无裸空表、无保存钮） ================= */
  // 构造「从未安装过技能」实态：清单只余内置行（builtin 不列选项集，source 过滤后为空——真链
  // #68 空态实录）。破坏性变异放最后（后续节不再依赖安装行）。
  for (let i = skillFixtures.SKILL_ROWS.length - 1; i >= 0; i -= 1) {
    if (skillFixtures.SKILL_ROWS[i].source === 2) skillFixtures.SKILL_ROWS.splice(i, 1);
  }
  await page.goto(`${BASE}/aiplatform/skill-assignment`);
  await sleep(800);
  h.check(
    '空选项集：NEmpty 引导呈现（说明文案）',
    (await page.locator('.n-empty').count()) === 1 && (await page.locator('.n-empty').innerText()).includes('暂无可指派技能')
  );
  h.check('空选项集：跳转入口「去技能管理安装」在', (await page.getByRole('button', { name: /去技能管理安装/ }).count()) === 1);
  h.check(
    '空选项集：无裸空表、无保存钮（无可指派＝保存无意义）',
    (await page.locator('.n-data-table').count()) === 0 && (await page.getByRole('button', { name: /保\s*存/ }).count()) === 0
  );
  await page.getByRole('button', { name: /去技能管理安装/ }).click();
  await page.waitForURL(/\/aiplatform\/skill$/, { timeout: 10000 });
  h.check('引导入口跳达技能管理页', page.url().endsWith('/aiplatform/skill'));
}

main()
  .catch(err => {
    console.error('E2E 执行异常：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 浏览器不关闭会挂住 node 事件循环（异常路径也要收口）
    if (browser) await browser.close();
    h.summary('aiplatform-skill-assignment E2E');
  });
