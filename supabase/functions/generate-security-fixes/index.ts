import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixGenerationRequest {
  results: any[];
  repositoryUrl: string;
  platform: string;
  owner: string;
  repo: string;
  accessToken?: string;
  createPullRequest?: boolean;
}

interface SecurityFix {
  issueId: string;
  title: string;
  description: string;
  file: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  testSuggestions: string[];
  conflictRisk: 'low' | 'medium' | 'high';
}

interface PullRequestData {
  title: string;
  body: string;
  files: Array<{
    path: string;
    content: string;
  }>;
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
      console.warn(`Could not fetch ${path}: ${response.status}`);
      return '';
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

async function generateFixWithAI(issue: any, fileContent: string): Promise<SecurityFix | null> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const prompt = `You are a senior security engineer tasked with generating specific code fixes for security vulnerabilities.

SECURITY ISSUE:
Title: ${issue.title}
Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
File: ${issue.file}
${issue.line ? `Line: ${issue.line}` : ''}

CURRENT FILE CONTENT:
\`\`\`
${fileContent.slice(0, 8000)}
\`\`\`

Generate a detailed security fix including:
1. The exact vulnerable code snippet that needs to be changed
2. The secure replacement code
3. A clear explanation of why this fix resolves the security issue
4. Test suggestions to verify the fix works correctly
5. Assessment of conflict risk (low/medium/high) if this code is changed

Respond with ONLY valid JSON in this format:
{
  "originalCode": "exact vulnerable code snippet",
  "fixedCode": "secure replacement code",
  "explanation": "detailed explanation of the fix and why it's secure",
  "testSuggestions": ["test suggestion 1", "test suggestion 2"],
  "conflictRisk": "low|medium|high"
}

Requirements:
- The originalCode must match exactly what's in the file
- The fixedCode must be production-ready and follow best practices
- Include imports or dependencies if needed in the fixed code
- Explain the security principles behind the fix
- Consider backwards compatibility and performance`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a security expert generating precise, production-ready code fixes. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const fixData = JSON.parse(jsonMatch[0]);
    
    return {
      issueId: issue.id,
      title: `Fix: ${issue.title}`,
      description: issue.description,
      file: issue.file,
      originalCode: fixData.originalCode || '',
      fixedCode: fixData.fixedCode || '',
      explanation: fixData.explanation || 'Security fix generated by AI',
      testSuggestions: fixData.testSuggestions || [],
      conflictRisk: fixData.conflictRisk || 'medium'
    };

  } catch (error) {
    console.error(`Error generating fix for ${issue.file}:`, error);
    return null;
  }
}

async function createGitHubPullRequest(owner: string, repo: string, prData: PullRequestData, token: string): Promise<string> {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // Create a new branch
  const branchName = `security-fixes-${Date.now()}`;
  
  // Get main branch reference
  const refResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, { headers });
  if (!refResponse.ok) {
    throw new Error('Failed to get main branch reference');
  }
  const refData = await refResponse.json();
  
  // Create new branch
  const createBranchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha
    })
  });
  
  if (!createBranchResponse.ok) {
    throw new Error('Failed to create branch');
  }

  // Update files in the new branch
  for (const file of prData.files) {
    // Get current file to get its SHA
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=main`, { headers });
    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      
      // Update file
      const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Security fix: Update ${file.path}`,
          content: btoa(file.content),
          sha: fileData.sha,
          branch: branchName
        })
      });
      
      if (!updateResponse.ok) {
        console.error(`Failed to update ${file.path}:`, updateResponse.status);
      }
    }
  }

  // Create pull request
  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: prData.title,
      body: prData.body,
      head: branchName,
      base: 'main'
    })
  });

  if (!prResponse.ok) {
    throw new Error('Failed to create pull request');
  }

  const pr = await prResponse.json();
  return pr.html_url;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      results, 
      repositoryUrl, 
      platform, 
      owner, 
      repo, 
      accessToken, 
      createPullRequest 
    }: FixGenerationRequest = await req.json();

    console.log('Generating security fixes for:', repositoryUrl);

    // Filter for fixable issues (limit to top 5 critical/high severity)
    const fixableIssues = results
      .filter(issue => 
        (issue.severity === 'critical' || issue.severity === 'high') &&
        issue.file && 
        !issue.file.includes('node_modules') &&
        !issue.file.includes('.git')
      )
      .slice(0, 5);

    console.log(`Generating fixes for ${fixableIssues.length} issues`);

    const fixes: SecurityFix[] = [];
    const fileChanges: Map<string, string> = new Map();

    // Generate fixes for each issue
    for (const issue of fixableIssues) {
      try {
        // Fetch the current file content
        let fileContent = '';
        if (accessToken) {
          fileContent = await fetchFileContent(platform, owner, repo, issue.file, accessToken);
        }
        
        if (!fileContent) {
          console.warn(`Could not fetch content for ${issue.file}, skipping fix generation`);
          continue;
        }

        // Generate fix using AI
        const fix = await generateFixWithAI(issue, fileContent);
        if (fix) {
          fixes.push(fix);
          
          // Apply the fix to file content for PR creation
          if (fix.originalCode && fix.fixedCode) {
            const updatedContent = fileContent.replace(fix.originalCode, fix.fixedCode);
            fileChanges.set(issue.file, updatedContent);
          }
        }
      } catch (error) {
        console.error(`Error generating fix for ${issue.file}:`, error);
      }
    }

    let pullRequestUrl = '';
    
    // Create pull request if requested and we have fixes
    if (createPullRequest && fixes.length > 0 && accessToken && platform === 'github') {
      try {
        const prData: PullRequestData = {
          title: `🔒 Security Fixes: Address ${fixes.length} security issues`,
          body: `## Security Fixes Applied

This pull request addresses ${fixes.length} security issues identified by BluPear Security Scanner.

### Issues Fixed:
${fixes.map(fix => `
**${fix.title}**
- File: \`${fix.file}\`
- Risk: ${fix.conflictRisk} conflict risk
- Fix: ${fix.explanation}

**Testing Suggestions:**
${fix.testSuggestions.map(test => `- ${test}`).join('\n')}
`).join('\n')}

### Review Guidelines:
1. Test all functionality after applying these changes
2. Verify that security issues are resolved
3. Check for any breaking changes
4. Run your test suite to ensure compatibility

*Generated by BluPear Security Scanner*`,
          files: Array.from(fileChanges.entries()).map(([path, content]) => ({
            path,
            content
          }))
        };

        pullRequestUrl = await createGitHubPullRequest(owner, repo, prData, accessToken);
        console.log('Created pull request:', pullRequestUrl);
      } catch (error) {
        console.error('Error creating pull request:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixes,
        pullRequestUrl,
        summary: {
          totalIssues: results.length,
          fixableIssues: fixableIssues.length,
          fixesGenerated: fixes.length,
          pullRequestCreated: !!pullRequestUrl
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fix generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate security fixes'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});