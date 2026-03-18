// Test script to verify authentication endpoints
const fetch = require('node-fetch');

const SERVER_URL = 'http://157.173.101.159:9201';

async function testAuth() {
    console.log('🧪 Testing SmartPay Authentication\n');

    // Test 1: Login with admin
    console.log('1️⃣ Testing admin login...');
    try {
        const loginResponse = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('✓ Admin login response:', loginData);

        if (loginData.success) {
            console.log('✓ Admin login successful!');
            console.log(`  User: ${loginData.user.username}`);
            console.log(`  Role: ${loginData.user.role}`);
            console.log(`  Token: ${loginData.token}\n`);

            // Test 2: Create cashier account
            console.log('2️⃣ Testing cashier registration...');
            const registerResponse = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginData.token}`
                },
                body: JSON.stringify({
                    username: 'cashier1',
                    password: 'cashier123',
                    role: 'cashier',
                    fullName: 'Test Cashier'
                })
            });

            const registerData = await registerResponse.json();
            console.log('✓ Registration response:', registerData);

            if (registerData.success) {
                console.log('✓ Cashier created successfully!\n');

                // Test 3: Login with cashier
                console.log('3️⃣ Testing cashier login...');
                const cashierLoginResponse = await fetch(`${SERVER_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'cashier1',
                        password: 'cashier123'
                    })
                });

                const cashierLoginData = await cashierLoginResponse.json();
                console.log('✓ Cashier login response:', cashierLoginData);

                if (cashierLoginData.success) {
                    console.log('✓ Cashier login successful!\n');
                } else {
                    console.log('❌ Cashier login failed:', cashierLoginData.error);
                }
            } else {
                console.log('⚠️  Registration response:', registerData.error);
                console.log('   (This is OK if cashier already exists)\n');
            }
        } else {
            console.log('❌ Admin login failed:', loginData.error);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n✅ Authentication tests completed!');
}

testAuth();
