import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  repoUrl: string;
  platform?: string;
  accessToken?: string;
}

interface GitPlatform {
  name: string;
  apiBase: string;
  supports: string[];
}

const platforms: Record<string, GitPlatform> = {
  github: {
    name: 'GitHub',
    apiBase: 'https://api.github.com',
    supports: ['public', 'private']
  },
  gitlab: {
    name: 'GitLab',
    apiBase: 'https://gitlab.com/api/v4',
    supports: ['public', 'private']
  },
  bitbucket: {
    name: 'Bitbucket',
    apiBase: 'https://api.bitbucket.org/2.0',
    supports: ['public', 'private']
  }
};

function detectPlatform(url: string): string | null {
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitlab.com')) return 'gitlab';
  if (url.includes('bitbucket.org')) return 'bitbucket';
  return null;
}

function parseRepositoryUrl(url: string): { platform: string; owner: string; repo: string } | null {
  // GitHub URL pattern
  const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (githubMatch) {
    return { 
      platform: 'github', 
      owner: githubMatch[1], 
      repo: githubMatch[2].replace('.git', '') 
    };
  }

  // GitLab URL pattern
  const gitlabMatch = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)/);
  if (gitlabMatch) {
    return { 
      platform: 'gitlab', 
      owner: gitlabMatch[1], 
      repo: gitlabMatch[2].replace('.git', '') 
    };
  }

  // Bitbucket URL pattern
  const bitbucketMatch = url.match(/bitbucket\.org\/([^\/]+)\/([^\/]+)/);
  if (bitbucketMatch) {
    return { 
      platform: 'bitbucket', 
      owner: bitbucketMatch[1], 
      repo: bitbucketMatch[2].replace('.git', '') 
    };
  }

  return null;
}

async function fetchGitHubRepository(owner: string, repo: string, token?: string): Promise<{ files: any[], commitSha: string }> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) headers['Authorization'] = `token ${token}`;

  // Get latest commit
  const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/main`, { headers });
  if (!commitResponse.ok) {
    throw new Error(`GitHub API error: ${commitResponse.status}`);
  }
  const commitData = await commitResponse.json();

  // Get repository tree
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, { headers });
  if (!treeResponse.ok) {
    throw new Error(`GitHub API error: ${treeResponse.status}`);
  }
  const treeData = await treeResponse.json();

  return { files: treeData.tree || [], commitSha: commitData.sha };
}

async function fetchGitLabRepository(owner: string, repo: string, token?: string): Promise<{ files: any[], commitSha: string }> {
  const projectId = encodeURIComponent(`${owner}/${repo}`);
  const headers: Record<string, string> = {};
  if (token) headers['PRIVATE-TOKEN'] = token;

  // Get project info and latest commit
  const projectResponse = await fetch(`https://gitlab.com/api/v4/projects/${projectId}`, { headers });
  if (!projectResponse.ok) {
    throw new Error(`GitLab API error: ${projectResponse.status}`);
  }
  const projectData = await projectResponse.json();

  // Get repository tree
  const treeResponse = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true`, { headers });
  if (!treeResponse.ok) {
    throw new Error(`GitLab API error: ${treeResponse.status}`);
  }
  const treeData = await treeResponse.json();

  return { 
    files: treeData.map((item: any) => ({
      path: item.path,
      type: item.type === 'tree' ? 'tree' : 'blob',
      size: item.size
    })), 
    commitSha: projectData.default_branch_commit?.id || 'unknown'
  };
}

async function fetchBitbucketRepository(owner: string, repo: string, token?: string): Promise<{ files: any[], commitSha: string }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Get repository info
  const repoResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`, { headers });
  if (!repoResponse.ok) {
    throw new Error(`Bitbucket API error: ${repoResponse.status}`);
  }
  const repoData = await repoResponse.json();

  // Get repository tree
  const treeResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/main/?format=meta`, { headers });
  if (!treeResponse.ok) {
    throw new Error(`Bitbucket API error: ${treeResponse.status}`);
  }
  const treeData = await treeResponse.json();

  const files = treeData.values?.map((item: any) => ({
    path: item.path,
    type: item.type === 'commit_directory' ? 'tree' : 'blob',
    size: item.size
  })) || [];

  return { 
    files, 
    commitSha: repoData.mainbranch?.target?.hash || 'unknown'
  };
}

async function fetchFileContent(platform: string, owner: string, repo: string, path: string, token?: string): Promise<string> {
  let apiUrl = '';
  const headers: Record<string, string> = {};

  switch (platform) {
    case 'github':
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      if (token) headers['Authorization'] = `token ${token}`;
      break;
    case 'gitlab':
      const projectId = encodeURIComponent(`${owner}/${repo}`);
      const encodedPath = encodeURIComponent(path);
      apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=main`;
      if (token) headers['PRIVATE-TOKEN'] = token;
      break;
    case 'bitbucket':
      apiUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/main/${path}`;
      if (token) headers['Authorization'] = `Bearer ${token}`;
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  try {
    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    if (platform === 'github') {
      const data = await response.json();
      return data.content ? atob(data.content.replace(/\n/g, '')) : '';
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`Error fetching file ${path}:`, error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl, accessToken }: ScanRequest = await req.json();

    console.log('Universal scanner request:', { repoUrl });

    // Parse repository URL
    const repoInfo = parseRepositoryUrl(repoUrl);
    if (!repoInfo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid repository URL. Supported platforms: GitHub, GitLab, Bitbucket' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { platform, owner, repo } = repoInfo;
    console.log('Detected platform:', platform, 'Owner:', owner, 'Repo:', repo);

    // Fetch repository data based on platform
    let repositoryData: { files: any[], commitSha: string };
    
    switch (platform) {
      case 'github':
        repositoryData = await fetchGitHubRepository(owner, repo, accessToken);
        break;
      case 'gitlab':
        repositoryData = await fetchGitLabRepository(owner, repo, accessToken);
        break;
      case 'bitbucket':
        repositoryData = await fetchBitbucketRepository(owner, repo, accessToken);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Filter for code files
    const codeFiles = repositoryData.files.filter((file: any) => {
      if (file.type !== 'blob') return false;
      
      const codeExtensions = [
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', 
        '.rs', '.cpp', '.c', '.cs', '.swift', '.kt', '.scala', '.json', 
        '.yaml', '.yml', '.env', '.config', '.dockerfile'
      ];
      
      return codeExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
    }).slice(0, 20); // Limit to 20 files for performance

    console.log(`Found ${codeFiles.length} code files to analyze`);

    // Now call the enhanced github-scanner with the repository data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Authorization header to pass through user context
    const authHeader = req.headers.get('Authorization');

    const scannerResponse = await supabase.functions.invoke('github-scanner', {
      body: { 
        repoUrl,
        platform,
        owner,
        repo,
        repositoryData,
        accessToken 
      },
      headers: authHeader ? { Authorization: authHeader } : undefined
    });

    if (scannerResponse.error) {
      throw new Error(scannerResponse.error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        ...scannerResponse.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Universal scanner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to scan repository'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});