// Test login functionality using native http module
const http = require('http');

const SERVER_URL = 'localhost';
const PORT = 9201;

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SERVER_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
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

async function testLogin() {
    console.log('🧪 Testing login functionality...\n');

    try {
        // Test 1: Check debug endpoint
        console.log('1️⃣ Checking users in database...');
        const debugResponse = await makeRequest('/api/debug/users');
        console.log('Status:', debugResponse.status);
        console.log('Users:', JSON.stringify(debugResponse.data, null, 2));
        console.log('');

        // Test 2: Login as admin
        console.log('2️⃣ Testing admin login...');
        const loginResponse = await makeRequest('/api/login', 'POST', {
            username: 'admin',
            password: 'admin123'
        });

        console.log('Status:', loginResponse.status);
        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));

        if (loginResponse.data.success) {
            console.log('\n✅ Login test PASSED');
        } else {
            console.log('\n❌ Login test FAILED');
        }

        // Test 3: Login with wrong password
        console.log('\n3️⃣ Testing login with wrong password...');
        const wrongLoginResponse = await makeRequest('/api/login', 'POST', {
            username: 'admin',
            password: 'wrongpassword'
        });

        console.log('Status:', wrongLoginResponse.status);
        console.log('Response:', JSON.stringify(wrongLoginResponse.data, null, 2));

        if (!wrongLoginResponse.data.success && wrongLoginResponse.status === 401) {
            console.log('✅ Correctly rejected wrong password');
        } else {
            console.log('❌ Should have rejected wrong password');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testLogin();
