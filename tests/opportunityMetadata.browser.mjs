import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const opportunities = JSON.parse(await readFile(new URL('../src/data/opportunities.json', import.meta.url), 'utf8'));
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4325';
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const lang of ['az', 'en']) {
      for (const opportunity of opportunities) {
        const path = `/${lang}/opportunities/${opportunity.slug}/`;
        const response = await page.goto(`${baseUrl}${path}`);
        assert.ok(response.ok(), path);
        await page.evaluate(() => document.fonts.ready);
        const grid = page.locator('.detail-keyfacts');
        const rows = await grid.locator(':scope > div').evaluateAll(items => items.map(item => ({
          label: item.querySelector('dt').textContent,
          value: item.querySelector('dd').textContent,
        })));
        const deadlineFacts = (opportunity.detailFacts ?? []).filter(fact => /deadline/i.test(fact.label.en));
        if (deadlineFacts.length === 1) {
          const deadline = deadlineFacts[0];
          assert.equal(rows.filter(row => row.label === deadline.label[lang]).length, 1, path);
          assert.ok(rows.some(row => row.label === deadline.label[lang] && row.value === deadline.value[lang]), path);
          assert.equal(rows.length, 3 + opportunity.detailFacts.length, path);
        }
        for (const fact of opportunity.detailFacts ?? []) {
          assert.ok(rows.some(row => row.label === fact.label[lang] && row.value === fact.value[lang]), `${path}: lost ${fact.label[lang]}`);
        }
        assert.ok(rows.some(row => row.value === opportunity.organizer), path);
        assert.ok(rows.some(row => row.value === opportunity.eligibilitySummary[lang]), path);
        const styles = await grid.evaluate(element => {
          const style = getComputedStyle(element);
          return { columns: style.gridTemplateColumns.split(' ').length, gap: style.gap };
        });
        assert.equal(styles.columns, width === 1280 ? 2 : 1, path);
        assert.equal(styles.gap, '12px 18px', path);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path);
        if (opportunity.slug === 'nasa-space-apps-2026') {
          await grid.screenshot({ path: `/tmp/ab-deadline-${lang}-${width}.png` });
        }
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(`Passed: ${opportunities.length * 2} AZ/EN opportunity routes at mobile and desktop widths; all detailed facts, precise deadlines, layout, and runtime errors checked.`);
} finally {
  await browser.close();
}
