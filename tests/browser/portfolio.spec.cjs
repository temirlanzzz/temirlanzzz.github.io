const { test, expect } = require('@playwright/test');

test('existing portfolio is preserved and the added cards work', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#tiles article')).toHaveCount(10);
  const names = ['Tracer', 'Graft', 'Label Less', 'Cutout', 'FedAvg, live', 'pytest-facts', 'AXIS', 'Marginalia', 'ATRIUM', 'Arcanum'];
  await expect(page.locator('#tiles h3')).toHaveText(names);
  await expect(page.locator('#tiles video')).toHaveCount(8);
  await expect(page.locator('#work .also a')).toHaveCount(3);
  for (const id of ['draw-box', 'lab', 'pal-box', 'ask-box', 'opt-box', 'career', 'experience']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  for (const card of await page.locator('#tiles article').all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('img')).toHaveJSProperty('complete', true);
    await expect.poll(() => card.locator('img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  }
  // Visit existing reveal-on-scroll sections before a full-page capture.
  // A screenshot alone does not trigger IntersectionObserver below the viewport.
  for (const section of await page.locator('.rv').all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('opacity', '1');
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('portfolio.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.getByRole('link', { name: 'AXIS: open live demo' })).toHaveAttribute('href', 'https://temirlanzzz.github.io/robot_pose_estimation/');
  await expect(page.getByRole('link', { name: 'Marginalia: open live demo' })).toHaveAttribute('href', 'https://temirlanzzz.github.io/search-engine/');
  await expect(page.getByRole('link', { name: 'ATRIUM: open live demo' })).toHaveAttribute('href', 'atrium/');
  await expect(page.getByRole('link', { name: 'Arcanum: open live demo' })).toHaveAttribute('href', 'arcanum/');
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
