const { test, expect } = require('@playwright/test');

test('existing portfolio is preserved and both added cards work', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#tiles article')).toHaveCount(8);
  const names = ['Tracer', 'Graft', 'Label Less', 'Cutout', 'FedAvg, live', 'pytest-facts', 'AXIS', 'Marginalia'];
  await expect(page.locator('#tiles h3')).toHaveText(names);
  await expect(page.locator('#tiles video')).toHaveCount(6);
  await expect(page.locator('#work .also a')).toHaveCount(3);
  for (const id of ['draw-box', 'lab', 'pal-box', 'ask-box', 'opt-box', 'career', 'experience']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  for (const card of await page.locator('#tiles article').all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('img')).toHaveJSProperty('complete', true);
    await expect.poll(() => card.locator('img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('portfolio.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.getByRole('link', { name: 'AXIS: open live demo' })).toHaveAttribute('href', 'https://temirlanzzz.github.io/robot_pose_estimation/');
  await expect(page.getByRole('link', { name: 'Marginalia: open live demo' })).toHaveAttribute('href', 'https://temirlanzzz.github.io/search-engine/');
  expect(errors).toEqual([]);
});

test('nested Marginalia deployment loads assets and completes a search flow', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/search-engine/');
  await expect(page.getByRole('heading', { name: 'Good search leaves a paper trail.' })).toBeVisible();
  await expect(page.locator('.result-card')).not.toHaveCount(0);
  await page.getByLabel('Ranking model').selectOption('tfidf');
  await expect(page.locator('.model-tag')).toHaveText('TFIDF');
  await page.getByLabel('YOUR QUESTION, IN A FEW WORDS').fill('document neverindexedword');
  await page.getByLabel('Match terms').selectOption('AND');
  await expect(page.locator('.result-card')).toHaveCount(0);
  await page.getByLabel('Match terms').selectOption('OR');
  await expect(page.locator('.result-card')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText('Start with a word or two.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'document length ↗', exact: true }).click();
  await expect(page.locator('.result-card')).not.toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('nested-search.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
