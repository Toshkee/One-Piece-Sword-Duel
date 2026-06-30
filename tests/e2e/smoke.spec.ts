import { test, expect } from '@playwright/test';

/**
 * Happy-path smoke test: the game boots, the canvas mounts, and the menu's
 * "1 player" keyboard shortcut takes us into a match without errors.
 */
test('boots to the menu and starts a fight', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');

  // Phaser mounts a <canvas> into #app once Boot → Preload → Menu completes.
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // The HTML loading fallback should have been removed by BootScene.
  await expect(page.locator('#boot-fallback')).toHaveCount(0);

  // Press "1" to start a CPU match (a menu keyboard shortcut).
  await page.keyboard.press('1');
  await page.waitForTimeout(1500);

  expect(errors, `runtime errors: ${errors.join('\n')}`).toHaveLength(0);
});
