import { Handler } from '@netlify/functions';
import { Octokit } from '@octokit/rest';
import { Base64 } from 'js-base64';

interface RepoInfo {
  owner: string;
  repo: string;
}

const getRepoInfo = (url: string): RepoInfo => {
  const parts = url.split('/');
  return {
    owner: parts[parts.length - 2],
    repo: parts[parts.length - 1],
  };
};

const shouldExclude = (
  path: string,
  excludeTypes: string[],
  excludeDirs: string[],
  excludeFiles: string[]
): boolean => {
  const fileName = path.split('/').pop() || '';
  const dirName = path.split('/').slice(0, -1).join('/');

  if (excludeTypes.some(ext => path.endsWith(ext))) return true;
  if (excludeDirs.some(dir => dirName.startsWith(dir))) return true;
  if (excludeFiles.includes(fileName)) return true;
  return false;
};

const processDirectory = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  excludeTypes: string[],
  excludeDirs: string[],
  excludeFiles: string[]
): Promise<string> => {
  console.log(`Processing directory: ${path}`);
  let markdown = '';
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    console.log(`Got contents for path: ${path}`);

    for (const content of Array.isArray(contents) ? contents : [contents]) {
      console.log(`Processing item: ${content.path}`);
      try {
        if (shouldExclude(content.path, excludeTypes, excludeDirs, excludeFiles)) {
          console.log(`Excluding item: ${content.path}`);
          continue;
        }

        if (content.type === 'dir') {
          console.log(`Processing subdirectory: ${content.path}`);
          markdown += await processDirectory(
            octokit,
            owner,
            repo,
            content.path,
            excludeTypes,
            excludeDirs,
            excludeFiles
          );
        } else if (content.type === 'file') {
          console.log(`Processing file: ${content.path}`);
          const fileContent = await octokit.repos.getContent({
            owner,
            repo,
            path: content.path,
          }).then(response => Base64.decode((response.data as any).content));
          
          markdown += `## ${content.path}\n\n`;
          if (content.path.toLowerCase().endsWith('.md') || content.path.toLowerCase().endsWith('.markdown')) {
            markdown += fileContent + '\n\n';
          } else {
            const fileExt = content.path.split('.').pop() || '';
            markdown += '```' + fileExt + '\n' + fileContent + '\n```\n\n';
          }
        } else {
          console.log(`Skipping unknown item type: ${content.type} for ${content.path}`);
        }
      } catch (itemError) {
        console.error(`Error processing item ${content.path}:`, itemError);
        throw itemError;
      }
    }
    console.log(`Finished processing directory: ${path}`);
  } catch (error) {
    console.error(`Error processing directory ${path}:`, error);
    throw error;
  }

  return markdown;
};

const handler: Handler = async (event) => {
  console.log('Handler function started');
  if (event.httpMethod !== 'POST') {
    console.log('Method not allowed:', event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log('Parsing request body');
  const { repoUrl, excludeTypes, excludeDirs, excludeFiles } = JSON.parse(event.body || '{}');
  console.log('Parsed request body:', { repoUrl, excludeTypes, excludeDirs, excludeFiles });

  const accessToken = event.headers.authorization?.split(' ')[1];
  console.log('Access token present:', !!accessToken);

  if (!repoUrl) {
    console.log('Repository URL is missing');
    return { statusCode: 400, body: JSON.stringify({ error: 'Repository URL is required' }) };
  }

  if (!accessToken) {
    console.log('Access token is missing');
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    console.log('Initializing Octokit');
    const octokit = new Octokit({ auth: accessToken });
    
    console.log('Getting repo info');
    const { owner, repo } = getRepoInfo(repoUrl);
    console.log('Repo info:', { owner, repo });

    console.log('Fetching repo data');
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    console.log('Repo data fetched');

    let markdown = `# ${repoData.name}\n\n${repoData.description || ''}\n\n`;

    console.log('Processing directory');
    markdown += await processDirectory(
      octokit,
      owner,
      repo,
      '',
      excludeTypes ? excludeTypes.split(',').map((t: string) => t.trim()) : [],
      excludeDirs ? excludeDirs.split(',').map((d: string) => d.trim()) : [],
      excludeFiles ? excludeFiles.split(',').map((f: string) => f.trim()) : []
    );
    console.log('Directory processing completed');

    console.log('Returning successful response');
    return {
      statusCode: 200,
      body: JSON.stringify({ markdown }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An error occurred while processing the repository', 
        details: error.message,
        stack: error.stack
      }),
    };
  }
};

export { handler };