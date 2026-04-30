const request = require('http');

const postData = JSON.stringify({
  username: 'user1',
  password: 'password123',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = request.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log(parsedData);
      if (res.statusCode === 200 && parsedData.token) {
        console.log('Test passed: Successfully received a token.');
      } else {
        console.log('Test failed: Failed to receive a token or unexpected status code.');
      }
    } catch (e) {
      console.error(e.message);
      console.log('Test failed: Error parsing JSON response.');
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  console.log('Test failed: Request error.');
});

// Write data to request body
req.write(postData);
req.end();

