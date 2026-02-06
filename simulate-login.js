

// import fetch from 'node-fetch'; // Using native fetch


const AUTH_BASE = 'http://localhost:3001';
const API_BASE = 'http://localhost:3000';

async function simulateLogin() {
    console.log("Simulating Login...");

    // 1. Login
    const loginRes = await fetch(`${AUTH_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'password',
            username: 'anton.maaser@icloud.com',
            password: 'password' // Assuming this is the dev password
        })
    });

    if (!loginRes.ok) {
        console.error("Login Failed:", loginRes.status, await loginRes.text());
        return;
    }

    const tokenData = await loginRes.json();
    console.log("Login Success!");
    console.log("Token Data Keys:", Object.keys(tokenData));
    console.log("Organization ID:", tokenData.organizationId);

    if (!tokenData.organizationId) {
        console.error("CRITICAL: organizationId is missing from token response!");
    } else {
        console.log("organizationId is present.");
    }

    // 2. Fetch User
    console.log("Fetching User Data...");
    const userRes = await fetch(`${API_BASE}/users/${tokenData.user_id}`, {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/vnd.api+json'
        }
    });

    if (!userRes.ok) {
        console.error("Fetch User Failed:", userRes.status, await userRes.text());
        return;
    }

    const userData = await userRes.json();
    console.log("Fetch User Success!", userData.data.id);
}

simulateLogin().catch(console.error);
