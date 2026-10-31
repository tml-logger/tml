import { expect, test } from 'playwright/test';

test('SSR is readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL ?? '');
  await expect(page.getByRole('heading', { name: /Tiny micro logger demo/ })).toBeVisible();
  await expect(page.getByTestId('hydration-status')).toContainText('Server rendered');
  await expect(page.locator('head link[rel="stylesheet"]')).toHaveCount(1);
  await expect(page.locator('body')).toHaveCSS('margin', '0px');
  await expect(page.locator('.brand-logo')).toHaveCSS('width', '150px');
  await expect(page.getByTestId('request-id')).not.toBeEmpty();
  await context.close();
});

test('hydrates cleanly and DevTools controls filter all levels', async ({ page }) => {
  const errors: string[] = [];
  const messages: { type: string; text: string }[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => messages.push({ type: message.type(), text: message.text() }));
  await page.goto('/');
  await expect(page.getByTestId('hydration-status')).toContainText('Hydrated');
  const requestId = await page.getByTestId('request-id').textContent();
  const bootstrapId = await page.locator('#tml-bootstrap').evaluate((element) => JSON.parse(element.textContent ?? '{}').requestId);
  expect(requestId).toBe(bootstrapId);

  for (const level of ['log', 'debug', 'info', 'warn', 'error']) {
    await page.getByRole('button', { name: level, exact: true }).click();
  }
  expect(messages.filter((message) => message.text.includes('[demo.'))).toEqual([]);
  await page.evaluate('globalThis.tml.watch("demo.*")');
  for (const level of ['log', 'debug', 'info', 'warn', 'error']) {
    await page.getByRole('button', { name: level, exact: true }).click();
  }
  await expect.poll(() => messages.filter((message) => message.text.includes('[demo.client.action]')).length).toBe(5);
  expect(messages.filter((message) => message.text.includes('[demo.client.action]')).map((message) => message.type)).toEqual(['log', 'debug', 'info', 'warning', 'error']);
  await page.evaluate('globalThis.tml.unwatch("demo.*")');
  await page.getByRole('button', { name: 'warn', exact: true }).click();
  expect(messages.filter((message) => message.text.includes('[demo.client.action]'))).toHaveLength(5);
  expect(errors).toEqual([]);
  expect(messages.filter((message) => /hydration|did not match/i.test(message.text))).toEqual([]);
});

test('API outcomes and development-only replay', async ({ page }, info) => {
  const messages: { type: string; text: string }[] = [];
  page.on('console', (message) => messages.push({ type: message.type(), text: message.text() }));
  await page.goto('/');
  await expect(page.getByTestId('hydration-status')).toContainText('Hydrated');
  await page.getByRole('button', { name: 'Watch demo scopes', exact: true }).click();
  await page.getByRole('button', { name: 'Successful request', exact: true }).click();
  await expect(page.getByTestId('request-result')).toContainText('200');
  await page.getByRole('button', { name: 'Fail a request', exact: true }).click();
  await expect(page.getByTestId('request-result')).toContainText('500');
  await expect(page.getByRole('button', { name: 'Replay latest API logs' })).toHaveCount(0);
  for (const query of ['', '?fail=1']) {
    const response = await page.request.get(`/api/demo${query}`);
    expect(await response.json()).not.toHaveProperty('logs');
  }
  if (info.project.name === 'production') {
    await expect(page.getByRole('button', { name: 'Replay SSR logs' })).toBeDisabled();
    const bootstrap = await page.locator('#tml-bootstrap').evaluate((element) => JSON.parse(element.textContent ?? '{}'));
    expect(bootstrap).not.toHaveProperty('logs');
    const response = await page.request.get('/api/demo');
    expect(await response.json()).not.toHaveProperty('logs');
    return;
  }
  await page.getByRole('button', { name: 'Replay SSR logs' }).click();
  await expect.poll(() => messages.filter((message) => message.text.includes('[demo.server.ssr]')).length).toBe(2);
  await page.getByRole('button', { name: 'Unwatch demo scopes', exact: true }).click();
  const count = messages.filter((message) => message.text.includes('[demo.server.')).length;
  await page.getByRole('button', { name: 'Replay SSR logs' }).click();
  expect(messages.filter((message) => message.text.includes('[demo.server.'))).toHaveLength(count);
});

test('alerts show redaction and actual delivery failure', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hydration-status')).toContainText('Hydrated');
  const sent = page.waitForRequest((request) => request.url().endsWith('/api/alerts') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Send demo alert' }).click();
  const body = (await sent).postData() ?? '';
  expect(body).toContain('[REDACTED]');
  expect(body).not.toContain('demo-password');
  expect(body).not.toContain('demo-access-token');
  expect(body).not.toContain('Bearer demo-secret');
  await expect(page.getByTestId('alert-result')).toContainText('"ok": true');
  await expect(page.getByTestId('alert-result')).toContainText('[REDACTED]');
  await page.getByRole('button', { name: 'Fail alert delivery' }).click();
  await expect(page.getByTestId('alert-result')).toContainText('"ok": false');
  await expect(page.getByTestId('alert-result')).toContainText('503');
});
