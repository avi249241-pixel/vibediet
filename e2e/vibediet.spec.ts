import { test, expect } from '@playwright/test';

test.describe('VibeDiet End-to-End Application Suite', () => {
  test('1. renders header, brand, and concentric macro matrix', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/VibeDiet/i);

    // Check branding
    await expect(page.getByText('VibeDiet', { exact: false })).toBeVisible();
    await expect(page.getByText('PRO 2.0')).toBeVisible();

    // Check Concentric Rings Center Counter
    await expect(page.locator('main').getByText(/Remaining/i)).toBeVisible();
    await expect(page.getByText('kcal today')).toBeVisible();

    // Check Macro Targets Cards
    await expect(page.getByText('Energy Target')).toBeVisible();
    await expect(page.getByText('Protein Target')).toBeVisible();
    await expect(page.getByText('Carbohydrates')).toBeVisible();
    await expect(page.getByText('Dietary Fat')).toBeVisible();
  });

  test('2. navigates fluidly across tabs using motion.dev shared layout', async ({ page }) => {
    await page.goto('/');

    // Navigate to Photo Log
    await page.getByRole('button', { name: 'Photo Log' }).first().click();
    await expect(page.getByRole('heading', { name: /Capture or Upload Meal Photo/i })).toBeVisible();

    // Navigate to Metabolism & TDEE
    await page.getByRole('button', { name: /Metabolism & TDEE/i }).click();
    await expect(page.getByRole('heading', { name: /Adaptive Energy Expenditure/i })).toBeVisible();

    // Navigate to Manual Entry
    await page.getByRole('button', { name: /Manual Entry/i }).click();
    await expect(page.getByRole('heading', { name: /Manual Meal Entry/i })).toBeVisible();

    // Navigate to Targets & Goals
    await page.getByRole('button', { name: /Targets & Goals/i }).click();
    await expect(page.getByRole('heading', { name: /Body Biometrics & Goals/i })).toBeVisible();

    // Return to Daily Diary (handles counter badge)
    await page.getByRole('button', { name: /Daily Diary/i }).click();
    await expect(page.getByText('Energy Target')).toBeVisible();
  });

  test('3. opens and closes floating Omnibar Voice modal', async ({ page }) => {
    await page.goto('/');

    // Click Voice button on floating Omnibar Dock
    const voiceBtn = page.getByRole('button', { name: 'Voice' });
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();

    // Verify modal appears
    await expect(page.getByRole('heading', { name: /Voice & Natural Language Logging/i })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Voice & Natural Language Logging/i })).not.toBeVisible();
  });
});
