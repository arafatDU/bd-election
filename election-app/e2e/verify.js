// Simulating a verification script in Node.js instead of full browser test for environment compatibility
// checks basic api responses

const http = require('http');

async function checkApi(url, method = 'GET', body = null) {
  try {
    const res = await fetch('http://localhost:3000' + url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : null
    });
    return { status: res.status, data: await res.json() };
  } catch (e) {
    return { error: e.message };
  }
}

console.log('Verification script ready. Run the server first.');
