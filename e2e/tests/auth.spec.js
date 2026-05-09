/**
 * E2E Tests: Authentication Flows
 * Critical path: Login, register, logout
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  
  test('user can login with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials (use test account)
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Verify user menu visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('user cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/);
  });
  
  test('user can register new account', async ({ page }) => {
    await page.goto('/register');
    
    // Generate unique email
    const email = `test${Date.now()}@example.com`;
    
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    
    // Accept terms
    await page.check('[name="acceptTerms"]');
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or onboarding
    await expect(page).toHaveURL(/.*(dashboard|onboarding).*/);
  });
  
  test('user can logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/.*(login|home).*/);
    
    // Verify no longer authenticated
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });
  
});
