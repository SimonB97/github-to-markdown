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
  let markdown = '';
  const { data: contents } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  for (const content of Array.isArray(contents) ? contents : [contents]) {
    if (shouldExclude(content.path, excludeTypes, excludeDirs, excludeFiles)) {
      continue;
    }

    if (content.type === 'dir') {
      markdown += await processDirectory(
        octokit,
        owner,
        repo,
        content.path,
        excludeTypes,
        excludeDirs,
        excludeFiles
      );
    } else {
      const fileContent = Base64.decode(content.content);
      markdown += `## ${content.path}\n\n`;
      if (content.path.toLowerCase().endsWith('.md') || content.path.toLowerCase().endsWith('.markdown')) {
        markdown += fileContent + '\n\n';
      } else {
        const fileExt = content.path.split('.').pop() || '';
        markdown += '```' + fileExt + '\n' + fileContent + '\n```\n\n';
      }
    }
  }

  return markdown;
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { repoUrl, excludeTypes, excludeDirs, excludeFiles } = JSON.parse(event.body || '{}');
  const accessToken = event.headers.authorization?.split(' ')[1];

  if (!repoUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Repository URL is required' }) };
  }

  if (!accessToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    const octokit = new Octokit({ auth: accessToken });
    const { owner, repo } = getRepoInfo(repoUrl);

    const { data: repoData } = await octokit.repos.get({ owner, repo });

    let markdown = `# ${repoData.name}\n\n${repoData.description || ''}\n\n`;

    markdown += await processDirectory(
      octokit,
      owner,
      repo,
      '',
      excludeTypes ? excludeTypes.split(',').map((t: string) => t.trim()) : [],
      excludeDirs ? excludeDirs.split(',').map((d: string) => d.trim()) : [],
      excludeFiles ? excludeFiles.split(',').map((f: string) => f.trim()) : []
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ markdown }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while processing the repository' }),
    };
  }
};

export { handler };