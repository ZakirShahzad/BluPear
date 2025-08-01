import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  impact?: string;
  cwe_reference?: string;
  owasp_category?: string;
}

interface SecurityScore {
  overall: number;
  secrets: number;
  vulnerabilities: number;
  configurations: number;
  patterns: number;
}

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

async function analyzeCodeWithAI(content: string, filename: string, fileType: string): Promise<ScanResult[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const prompt = `You are a senior cybersecurity expert with extensive experience in application security, penetration testing, and secure coding practices. Analyze the following source code for security vulnerabilities with exceptional detail and precision.

TASK: Perform a comprehensive security analysis of the ${fileType} file and return ONLY a valid JSON array with detailed findings.

ANALYSIS FRAMEWORK:
1. SECRETS & CREDENTIALS: Hardcoded API keys, passwords, tokens, certificates, database credentials, encryption keys
2. INJECTION VULNERABILITIES: SQL injection, NoSQL injection, LDAP injection, OS command injection, code injection
3. AUTHENTICATION & AUTHORIZATION: Broken authentication, session management flaws, privilege escalation, insecure direct object references
4. CRYPTOGRAPHIC ISSUES: Weak algorithms, improper key management, insecure random number generation, weak hashing
5. INPUT VALIDATION: XSS, CSRF, path traversal, file upload vulnerabilities, deserialization attacks
6. CONFIGURATION SECURITY: Debug modes, verbose error messages, insecure defaults, missing security headers
7. BUSINESS LOGIC FLAWS: Race conditions, workflow bypasses, insufficient rate limiting
8. INFORMATION DISCLOSURE: Sensitive data exposure, error message leakage, logging sensitive information

SEVERITY CLASSIFICATION:
- CRITICAL: Immediate exploit risk, data breach potential, system compromise (RCE, exposed secrets, auth bypass)
- HIGH: Serious security impact, user data at risk (XSS, SQL injection, privilege escalation)  
- MEDIUM: Security weakness, potential for exploitation (weak crypto, CSRF, info disclosure)
- LOW: Security best practice violation, hardening opportunity (deprecated functions, weak configs)

FILE: ${filename}
CONTENT:
\`\`\`${fileType}
${content.slice(0, 12000)}
\`\`\`

For each security issue identified, provide:
{
  "type": "secret|vulnerability|misconfiguration|pattern",
  "severity": "critical|high|medium|low",
  "title": "Specific, technical issue title",
  "description": "Comprehensive explanation including: 1) What the vulnerability is, 2) Why it's dangerous, 3) How it could be exploited, 4) What data/systems are at risk, 5) Real-world attack scenarios",
  "line": line_number_if_identifiable,
  "remediation": "Detailed step-by-step fix instructions including: 1) Immediate mitigation steps, 2) Proper implementation example, 3) Additional security considerations, 4) Testing/verification steps, 5) Prevention strategies for future development",
  "impact": "Detailed explanation of potential business and technical impact",
  "cwe_reference": "Common Weakness Enumeration ID if applicable (e.g., CWE-79, CWE-89)",
  "owasp_category": "OWASP Top 10 category if applicable (e.g., A03:2021 - Injection)"
}

REQUIREMENTS:
- Provide exhaustive technical analysis for each finding
- Include specific code examples in remediation advice
- Explain attack vectors and exploitation techniques
- Consider both immediate and long-term security implications
- Reference industry standards (OWASP, CWE, NIST) where applicable
- If no issues found, return empty array []
- Return ONLY valid JSON, no explanations or markdown outside the JSON structure`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior cybersecurity expert specializing in comprehensive vulnerability assessment. Provide detailed, actionable security analysis in JSON format with extensive technical explanations and remediation guidance.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log(`AI response for ${filename}:`, aiResponse);

    // Parse the JSON response
    let issues: any[] = [];
    try {
      // Extract JSON if wrapped in markdown
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      issues = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiResponse);
      return [];
    }

    // Convert to ScanResult format with enhanced details
    return issues.map((issue, index) => ({
      id: `ai-${filename}-${index}`,
      type: issue.type || 'pattern',
      severity: issue.severity || 'medium',
      title: issue.title || 'Security Issue',
      description: issue.description || 'Security issue detected by AI analysis',
      file: filename,
      line: issue.line,
      suggestion: issue.remediation || issue.suggestion || 'Review and implement security best practices',
      impact: issue.impact || 'Potential security risk identified',
      cwe_reference: issue.cwe_reference || '',
      owasp_category: issue.owasp_category || ''
    }));

  } catch (error) {
    console.error(`AI analysis error for ${filename}:`, error);
    return [];
  }
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: { [key: string]: string } = {
    'js': 'javascript',
    'ts': 'typescript', 
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'env': 'environment',
    'config': 'configuration'
  };
  return typeMap[ext || ''] || 'text';
}

function calculateSecurityScore(results: ScanResult[]): SecurityScore {
  const typeCount = {
    secret: results.filter(r => r.type === 'secret').length,
    vulnerability: results.filter(r => r.type === 'vulnerability').length,
    misconfiguration: results.filter(r => r.type === 'misconfiguration').length,
    pattern: results.filter(r => r.type === 'pattern').length,
  };

  const severityWeights = { critical: 30, high: 20, medium: 10, low: 5 };
  const totalDeductions = results.reduce((sum, result) => sum + severityWeights[result.severity], 0);
  
  // Calculate category-specific scores
  const secrets = Math.max(0, 100 - (typeCount.secret * 25));
  const vulnerabilities = Math.max(0, 100 - (typeCount.vulnerability * 20));
  const configurations = Math.max(0, 100 - (typeCount.misconfiguration * 15));
  const patterns = Math.max(0, 100 - (typeCount.pattern * 10));
  
  // Overall score considers both issue count and severity
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
    
    console.log('Starting AI-powered scan for repository:', repoUrl);
    
    // Parse GitHub URL
    const repoInfo = await parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error('Invalid GitHub repository URL');
    }

    const { owner, repo } = repoInfo;
    console.log(`Scanning repository: ${owner}/${repo}`);

    // Fetch repository structure
    const files = await fetchRepositoryFiles(owner, repo);
    
    // Filter and prioritize files to scan
    const codeFiles = files.filter(file => 
      file.type === 'blob' && 
      /\.(js|ts|jsx|tsx|py|java|php|rb|go|rs|cpp|c|h|cs|swift|kt|scala|json|yaml|yml|env|config)$/i.test(file.path) &&
      file.size < 500000 // Skip files larger than 500KB
    )
    .sort((a, b) => {
      // Prioritize sensitive files
      const sensitivePatterns = ['config', 'env', 'secret', 'key', 'auth', 'security'];
      const aScore = sensitivePatterns.some(p => a.path.toLowerCase().includes(p)) ? 1 : 0;
      const bScore = sensitivePatterns.some(p => b.path.toLowerCase().includes(p)) ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, 25); // Limit to 25 files for API cost management

    console.log(`Found ${codeFiles.length} code files to analyze with AI`);

    const allResults: ScanResult[] = [];

    // Analyze each file with AI
    for (const file of codeFiles) {
      try {
        const content = await fetchFileContent(owner, repo, file.path);
        if (content.length > 0) {
          const fileType = getFileType(file.path);
          const fileResults = await analyzeCodeWithAI(content, file.path, fileType);
          allResults.push(...fileResults);
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error analyzing file ${file.path}:`, error);
        // Continue with other files
      }
    }

    // Calculate security score
    const securityScore = calculateSecurityScore(allResults);

    console.log(`AI scan complete. Found ${allResults.length} issues.`);

    return new Response(JSON.stringify({
      success: true,
      results: allResults,
      securityScore,
      filesScanned: codeFiles.length,
      repository: `${owner}/${repo}`,
      analysisMethod: 'AI-Powered'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('AI scan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});