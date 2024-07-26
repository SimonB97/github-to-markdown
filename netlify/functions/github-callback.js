const axios = require('axios');

exports.handler = async function(event, context) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let code;
  if (event.httpMethod === 'GET') {
    code = event.queryStringParameters.code;
  } else if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    code = body.code;
  } else {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!code) {
    return { statusCode: 400, body: 'Missing code parameter' };
  }

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    // Redirect back to the main page with the access token
    return {
      statusCode: 302,
      headers: {
        Location: `/?access_token=${response.data.access_token}`
      },
      body: ''
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to exchange code for token' })
    };
  }
};