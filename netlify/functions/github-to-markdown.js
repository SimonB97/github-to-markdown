const axios = require('axios');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { repoUrl } = JSON.parse(event.body);
  const [owner, repo] = repoUrl.split('/').slice(-2);

  const accessToken = event.headers.authorization.split(' ')[1];

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let markdown = `# ${repo}\n\n`;
    for (const file of response.data) {
      if (file.type === 'file' && file.name.endsWith('.md')) {
        const contentResponse = await axios.get(file.download_url, {
          headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/vnd.github.v3.raw'
          }
        });
        markdown += `## ${file.name}\n\n${contentResponse.data}\n\n`;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ markdown })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch repository contents' })
    };
  }
};