/**
 * CRITICAL E2E Tests: Tenant Isolation
 * Ensures Tenant A cannot access Tenant B data
 */

const { test, expect } = require('@playwright/test');

test.describe('CRITICAL: Tenant Isolation', () => {
  
  test('Tenant A cannot access Tenant B client data', async ({ page, browser }) => {
    // Create two browser contexts (simulating two users from different tenants)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    try {
      // Login as Tenant A user
      await pageA.goto('/login');
      await pageA.fill('[name="email"]', 'tenanta@example.com');
      await pageA.fill('[name="password"]', 'password');
      await pageA.click('button[type="submit"]');
      
      // Login as Tenant B user
      await pageB.goto('/login');
      await pageB.fill('[name="email"]', 'tenantb@example.com');
      await pageB.fill('[name="password"]', 'password');
      await pageB.click('button[type="submit"]');
      
      // Get a client ID from Tenant B
      await pageB.goto('/clients');
      const clientBId = await pageB.locator('[data-client-id]').first().getAttribute('data-client-id');
      
      // Try to access with Tenant A
      await pageA.goto(`/clients/${clientBId}`);
      
      // Should NOT show the client data
      await expect(pageA.locator('[data-testid="client-not-found"]')).toBeVisible();
      
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
  
  test('Cross-tenant appointment access is blocked', async ({ page, browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    try {
      await pageA.goto('/login');
      await pageA.fill('[name="email"]', 'tenanta@example.com');
      await pageA.fill('[name="password"]', 'password');
      await pageA.click('button[type="submit"]');
      
      // Try to access appointment with fake tenant B ID
      await pageA.goto('/appointments?tenant_id=fake-tenant-b-id');
      
      // URL parameter should be ignored
      // Should only show Tenant A appointments
      const appointments = await pageA.locator('[data-appointment]').count();
      
      // Verify all appointments belong to Tenant A
      const tenantIds = await pageA.locator('[data-tenant-id]').allTextContents();
      const allTenantA = tenantIds.every(id => id === 'tenanta-id');
      expect(allTenantA).toBe(true);
      
    } finally {
      await contextA.close();
    }
  });
  
  test('Master user can switch tenants', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'master@beautyhub.com');
    await page.fill('[name="password"]', 'masterpassword');
    await page.click('button[type="submit"]');
    
    // Should have tenant selector
    await expect(page.locator('[data-testid="tenant-selector"]')).toBeVisible();
    
    // Switch to Tenant A
    await page.selectOption('[data-testid="tenant-selector"]', 'tenant-a');
    await expect(page.locator('[data-testid="current-tenant"]')).toHaveText('Tenant A');
    
    // Switch to Tenant B
    await page.selectOption('[data-testid="tenant-selector"]', 'tenant-b');
    await expect(page.locator('[data-testid="current-tenant"]')).toHaveText('Tenant B');
  });
  
});
