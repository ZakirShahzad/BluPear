import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  repoUrl: string;
}

interface ScanResult {
  id: string;
  type: 'secret' | 'vulnerability' | 'misconfiguration' | 'pattern';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line?: number;
  suggestion?: string;
}

interface SecurityScore {
  overall: number;
  secrets: number;
  vulnerabilities: number;
  configurations: number;
  patterns: number;
}

// Security patterns to scan for
const SECRET_PATTERNS = [
  { pattern: /(?:key|api|token|secret|password)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi, type: 'API Key' },
  { pattern: /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*['"]?([A-Z0-9]{20})['"]?/gi, type: 'AWS Key' },
  { pattern: /(?:github_token|gh_token)\s*[:=]\s*['"]?(ghp_[a-zA-Z0-9]{36})['"]?/gi, type: 'GitHub Token' },
  { pattern: /(?:openai_api_key|openai_key)\s*[:=]\s*['"]?(sk-[a-zA-Z0-9]{48})['"]?/gi, type: 'OpenAI Key' },
  { pattern: /(?:stripe_key|stripe_secret)\s*[:=]\s*['"]?(sk_live_[a-zA-Z0-9]{99})['"]?/gi, type: 'Stripe Key' },
];

const VULNERABILITY_PATTERNS = [
  { pattern: /eval\s*\(/gi, title: 'Code Injection Risk', severity: 'critical' as const },
  { pattern: /innerHTML\s*=.*\+/gi, title: 'XSS Vulnerability', severity: 'high' as const },
  { pattern: /document\.cookie/gi, title: 'Cookie Access', severity: 'medium' as const },
  { pattern: /Math\.random\(\).*password|Math\.random\(\).*token/gi, title: 'Weak Random Generation', severity: 'medium' as const },
];

const MISCONFIGURATION_PATTERNS = [
  { pattern: /debug\s*[:=]\s*true/gi, title: 'Debug Mode Enabled', severity: 'medium' as const },
  { pattern: /cors\s*[:=]\s*\*|Access-Control-Allow-Origin.*\*/gi, title: 'Permissive CORS', severity: 'medium' as const },
  { pattern: /http:\/\/(?!localhost)/gi, title: 'HTTP Usage', severity: 'low' as const },
];

async function parseGitHubUrl(url: string): Promise<{ owner: string; repo: string } | null> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

async function fetchRepositoryFiles(owner: string, repo: string): Promise<any[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tree || [];
  } catch (error) {
    console.error('Error fetching repository:', error);
    throw error;
  }
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.content) {
      return atob(data.content.replace(/\n/g, ''));
    }
    return '';
  } catch (error) {
    console.error(`Error fetching file ${path}:`, error);
    return '';
  }
}

function scanFileContent(content: string, filename: string): ScanResult[] {
  const results: ScanResult[] = [];
  const lines = content.split('\n');

  // Scan for secrets
  SECRET_PATTERNS.forEach(({ pattern, type }) => {
    lines.forEach((line, index) => {
      const matches = line.match(pattern);
      if (matches) {
        results.push({
          id: `secret-${filename}-${index}`,
          type: 'secret',
          severity: 'critical',
          title: `Exposed ${type}`,
          description: `Potential ${type.toLowerCase()} found in source code`,
          file: filename,
          line: index + 1,
          suggestion: 'Move secrets to environment variables and use proper secret management'
        });
      }
    });
  });

  // Scan for vulnerabilities
  VULNERABILITY_PATTERNS.forEach(({ pattern, title, severity }) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        results.push({
          id: `vuln-${filename}-${index}`,
          type: 'vulnerability',
          severity,
          title,
          description: `Potential security vulnerability detected`,
          file: filename,
          line: index + 1,
          suggestion: 'Review and implement secure coding practices'
        });
      }
    });
  });

  // Scan for misconfigurations
  MISCONFIGURATION_PATTERNS.forEach(({ pattern, title, severity }) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        results.push({
          id: `config-${filename}-${index}`,
          type: 'misconfiguration',
          severity,
          title,
          description: `Security misconfiguration detected`,
          file: filename,
          line: index + 1,
          suggestion: 'Review configuration settings for production security'
        });
      }
    });
  });

  return results;
}

function calculateSecurityScore(results: ScanResult[]): SecurityScore {
  const typeCount = {
    secret: results.filter(r => r.type === 'secret').length,
    vulnerability: results.filter(r => r.type === 'vulnerability').length,
    misconfiguration: results.filter(r => r.type === 'misconfiguration').length,
    pattern: results.filter(r => r.type === 'pattern').length,
  };

  const severityWeights = { critical: 25, high: 15, medium: 10, low: 5 };
  const totalDeductions = results.reduce((sum, result) => sum + severityWeights[result.severity], 0);
  
  const secrets = Math.max(0, 100 - (typeCount.secret * 30));
  const vulnerabilities = Math.max(0, 100 - (typeCount.vulnerability * 20));
  const configurations = Math.max(0, 100 - (typeCount.misconfiguration * 15));
  const patterns = Math.max(0, 100 - (typeCount.pattern * 10));
  
  const overall = Math.max(0, 100 - Math.min(totalDeductions, 100));

  return {
    overall,
    secrets,
    vulnerabilities,
    configurations,
    patterns
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl }: ScanRequest = await req.json();
    
    console.log('Starting scan for repository:', repoUrl);
    
    // Parse GitHub URL
    const repoInfo = await parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error('Invalid GitHub repository URL');
    }

    const { owner, repo } = repoInfo;
    console.log(`Scanning repository: ${owner}/${repo}`);

    // Fetch repository structure
    const files = await fetchRepositoryFiles(owner, repo);
    
    // Filter files to scan (code files only)
    const codeFiles = files.filter(file => 
      file.type === 'blob' && 
      /\.(js|ts|jsx|tsx|py|java|php|rb|go|rs|cpp|c|h|cs|swift|kt|scala|json|yaml|yml|env|config)$/i.test(file.path) &&
      file.size < 1000000 // Skip files larger than 1MB
    ).slice(0, 50); // Limit to first 50 files to avoid rate limits

    console.log(`Found ${codeFiles.length} code files to scan`);

    const allResults: ScanResult[] = [];

    // Scan each file
    for (const file of codeFiles) {
      try {
        const content = await fetchFileContent(owner, repo, file.path);
        const fileResults = scanFileContent(content, file.path);
        allResults.push(...fileResults);
      } catch (error) {
        console.error(`Error scanning file ${file.path}:`, error);
        // Continue with other files
      }
    }

    // Calculate security score
    const securityScore = calculateSecurityScore(allResults);

    console.log(`Scan complete. Found ${allResults.length} issues.`);

    return new Response(JSON.stringify({
      success: true,
      results: allResults,
      securityScore,
      filesScanned: codeFiles.length,
      repository: `${owner}/${repo}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});