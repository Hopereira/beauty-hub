/**
 * OWNER Module Endpoints Test Script
 * Run: node test-owner-endpoints.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001';
let authToken = '';
let tenantId = '';
let professionalId = '';
let supplierId = '';
let productId = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': 'beleza-pura', // Multi-tenant header
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function test1_HealthCheck() {
  console.log('\n1️⃣  Testing Health Check...');
  const result = await makeRequest('GET', '/api/health');
  console.log(`   Status: ${result.status}`);
  console.log(`   ✅ API is running`);
  return result.status === 200;
}

async function test2_Login() {
  console.log('\n2️⃣  Testing Login...');
  const result = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@admin.com',
    password: '123456',
  });
  
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200 && result.data.data?.accessToken) {
    authToken = result.data.data.accessToken;
    tenantId = result.data.data.user?.tenant_id;
    
    // Decode JWT to check tenantId
    const tokenParts = authToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    console.log(`   ✅ Login successful`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User Tenant ID: ${tenantId || 'N/A'}`);
    console.log(`   JWT Tenant ID: ${payload.tenantId || 'N/A'}`);
    return true;
  }
  
  console.log(`   ❌ Login failed:`, JSON.stringify(result.data, null, 2));
  return false;
}

async function test3_ListSuppliers() {
  console.log('\n3️⃣  Testing List Suppliers...');
  const result = await makeRequest('GET', '/api/suppliers', null, authToken);
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200) {
    console.log(`   ✅ Suppliers endpoint working`);
    console.log(`   Found ${result.data.data?.length || 0} suppliers`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test4_CreateSupplier() {
  console.log('\n4️⃣  Testing Create Supplier...');
  const result = await makeRequest('POST', '/api/suppliers', {
    name: 'Fornecedor Teste API',
    document: '12.345.678/0001-90',
    phone: '(11) 98765-4321',
    email: 'teste@fornecedor.com',
    active: true,
  }, authToken);
  
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 201 && result.data.data?.id) {
    supplierId = result.data.data.id;
    console.log(`   ✅ Supplier created`);
    console.log(`   Supplier ID: ${supplierId}`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test5_ListProducts() {
  console.log('\n5️⃣  Testing List Products...');
  const result = await makeRequest('GET', '/api/products', null, authToken);
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200) {
    console.log(`   ✅ Products endpoint working`);
    console.log(`   Found ${result.data.data?.length || 0} products`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test6_CreateProduct() {
  console.log('\n6️⃣  Testing Create Product...');
  const result = await makeRequest('POST', '/api/products', {
    name: 'Shampoo Teste API',
    category: 'Shampoo',
    supplier_id: supplierId,
    cost_price: 50.00,
    sale_price: 80.00,
    stock_quantity: 10,
    minimum_stock: 5,
    active: true,
  }, authToken);
  
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 201 && result.data.data?.id) {
    productId = result.data.data.id;
    console.log(`   ✅ Product created`);
    console.log(`   Product ID: ${productId}`);
    console.log(`   Stock: ${result.data.data.stock_quantity}`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test7_CreatePurchase() {
  console.log('\n7️⃣  Testing Create Purchase (Stock Update)...');
  const result = await makeRequest('POST', '/api/purchases', {
    supplier_id: supplierId,
    payment_method: 'PIX',
    notes: 'Compra teste via API',
    items: [
      {
        product_id: productId,
        quantity: 20,
        unit_cost: 45.00,
      },
    ],
  }, authToken);
  
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 201 && result.data.data?.id) {
    console.log(`   ✅ Purchase created`);
    console.log(`   Purchase ID: ${result.data.data.id}`);
    console.log(`   Total: R$ ${result.data.data.total_amount}`);
    console.log(`   ⚠️  Stock should be updated from 10 to 30`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test8_VerifyStockUpdate() {
  console.log('\n8️⃣  Testing Stock Update Verification...');
  const result = await makeRequest('GET', `/api/products/${productId}`, null, authToken);
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200 && result.data.data) {
    const stock = result.data.data.stock_quantity;
    console.log(`   Current stock: ${stock}`);
    
    if (stock === 30) {
      console.log(`   ✅ Stock updated correctly (10 + 20 = 30)`);
      return true;
    } else {
      console.log(`   ⚠️  Stock is ${stock}, expected 30`);
      return false;
    }
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test9_ListProfessionals() {
  console.log('\n9️⃣  Testing List Professionals...');
  const result = await makeRequest('GET', '/api/professionals', null, authToken);
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200) {
    console.log(`   ✅ Professionals endpoint working`);
    console.log(`   Found ${result.data.data?.length || 0} professionals`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

async function test10_ListServicePayments() {
  console.log('\n🔟 Testing List Service Payments...');
  const result = await makeRequest('GET', '/api/payment-transactions', null, authToken);
  console.log(`   Status: ${result.status}`);
  
  if (result.status === 200) {
    console.log(`   ✅ Service Payments endpoint working`);
    console.log(`   Found ${result.data.data?.length || 0} payments`);
    return true;
  }
  
  console.log(`   ❌ Failed:`, result.data);
  return false;
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   OWNER MODULE - API ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════════');

  const tests = [
    test1_HealthCheck,
    test2_Login,
    test3_ListSuppliers,
    test4_CreateSupplier,
    test5_ListProducts,
    test6_CreateProduct,
    test7_CreatePurchase,
    test8_VerifyStockUpdate,
    test9_ListProfessionals,
    test10_ListServicePayments,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`   RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('✅ All tests passed! OWNER module is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.\n');
  }
}

runTests().catch(console.error);
