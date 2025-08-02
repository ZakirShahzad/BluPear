import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX_REQUESTS = 5;

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

interface CachedScanResult {
  repo_hash: string;
  commit_sha: string;
  results: ScanResult[];
  security_score: SecurityScore;
  files_scanned: number;
  scan_metadata: {
    files_analyzed: string[];
    content_hashes: { [file: string]: string };
    analysis_timestamp: string;
  };
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

async function fetchRepositoryFiles(owner: string, repo: string): Promise<{ files: any[], commitSha: string }> {
  // First get the latest commit SHA for caching
  const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/main`;
  const commitResponse = await fetch(commitUrl);
  if (!commitResponse.ok) {
    throw new Error(`GitHub API error: ${commitResponse.status}`);
  }
  const commitData = await commitResponse.json();
  const commitSha = commitData.sha;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { files: data.tree || [], commitSha };
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

// Add result caching functions
async function getCachedResults(owner: string, repo: string, commitSha: string): Promise<CachedScanResult | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const repoHash = btoa(`${owner}/${repo}`).replace(/[+=\/]/g, '');
  
  const { data, error } = await supabase
    .from('scan_cache')
    .select('*')
    .eq('repo_hash', repoHash)
    .eq('commit_sha', commitSha)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CachedScanResult;
}

async function storeCachedResults(owner: string, repo: string, commitSha: string, results: ScanResult[], securityScore: SecurityScore, filesScanned: number, metadata: any): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const repoHash = btoa(`${owner}/${repo}`).replace(/[+=\/]/g, '');
  
  const { error } = await supabase
    .from('scan_cache')
    .upsert({
      repo_hash: repoHash,
      commit_sha: commitSha,
      results,
      security_score: securityScore,
      files_scanned: filesScanned,
      scan_metadata: metadata,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error caching results:', error);
  }
}

// Create content hash for consistency
function createContentHash(content: string): string {
  // Simple hash function for content consistency
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Deduplicate results based on title, type, and file
function deduplicateResults(results: ScanResult[]): ScanResult[] {
  const seen = new Set<string>();
  const deduplicated: ScanResult[] = [];

  for (const result of results) {
    const key = `${result.type}-${result.title}-${result.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }

  return deduplicated;
}

async function analyzeCodeWithAI(content: string, filename: string, fileType: string, retryCount = 0): Promise<ScanResult[]> {
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
        temperature: 0, // Set to 0 for maximum determinism
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log(`AI response for ${filename}:`, aiResponse);

    // Parse the JSON response with retry logic
    let issues: any[] = [];
    try {
      // Extract JSON if wrapped in markdown
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      issues = JSON.parse(jsonStr);
      
      // Validate response format
      if (!Array.isArray(issues)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiResponse);
      
      // Retry once with more explicit instructions
      if (retryCount < 1) {
        console.log('Retrying AI analysis with more explicit instructions...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return analyzeCodeWithAI(content, filename, fileType, retryCount + 1);
      }
      
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

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remainingRequests: number; resetTime: Date }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Check current usage in the time window
  const { data: existingLimits, error } = await supabase
    .from('edge_function_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('function_name', 'github-scanner')
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false });

  if (error) {
    console.error('Rate limit check error:', error);
    // Allow request if we can't check (fail open)
    return { allowed: true, remainingRequests: RATE_LIMIT_MAX_REQUESTS, resetTime: new Date() };
  }

  const totalRequests = existingLimits?.reduce((sum, limit) => sum + limit.request_count, 0) || 0;
  const allowed = totalRequests < RATE_LIMIT_MAX_REQUESTS;
  const remainingRequests = Math.max(0, RATE_LIMIT_MAX_REQUESTS - totalRequests);
  
  const nextWindow = new Date();
  nextWindow.setHours(nextWindow.getHours() + 1);

  return { allowed, remainingRequests, resetTime: nextWindow };
}

async function recordRateLimit(userId: string): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error } = await supabase
    .from('edge_function_rate_limits')
    .insert({
      user_id: userId,
      function_name: 'github-scanner',
      request_count: 1,
      window_start: new Date().toISOString()
    });

  if (error) {
    console.error('Rate limit recording error:', error);
  }
}

function calculateSecurityScore(results: ScanResult[]): SecurityScore {
  // More stable scoring algorithm with logarithmic scaling
  const typeCount = {
    secret: results.filter(r => r.type === 'secret').length,
    vulnerability: results.filter(r => r.type === 'vulnerability').length,
    misconfiguration: results.filter(r => r.type === 'misconfiguration').length,
    pattern: results.filter(r => r.type === 'pattern').length,
  };

  const severityWeights = { critical: 25, high: 15, medium: 8, low: 3 };
  
  // Use logarithmic scaling for more stable scores
  const calculateCategoryScore = (count: number, basePenalty: number) => {
    if (count === 0) return 100;
    const penalty = basePenalty * Math.log(1 + count);
    return Math.max(10, 100 - penalty); // Minimum score of 10
  };
  
  // Calculate category-specific scores with logarithmic scaling
  const secrets = calculateCategoryScore(typeCount.secret, 30);
  const vulnerabilities = calculateCategoryScore(typeCount.vulnerability, 25);
  const configurations = calculateCategoryScore(typeCount.misconfiguration, 20);
  const patterns = calculateCategoryScore(typeCount.pattern, 15);
  
  // Overall score uses weighted average of severity and count
  const totalWeightedIssues = results.reduce((sum, result) => sum + severityWeights[result.severity], 0);
  const overall = Math.max(10, 100 - (totalWeightedIssues * 0.8));

  return {
    overall: Math.round(overall),
    secrets: Math.round(secrets),
    vulnerabilities: Math.round(vulnerabilities),
    configurations: Math.round(configurations),
    patterns: Math.round(patterns)
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user ID from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} scans per ${RATE_LIMIT_WINDOW_HOURS} hour(s). Try again at ${rateLimitResult.resetTime.toISOString()}`,
        rateLimitInfo: {
          maxRequests: RATE_LIMIT_MAX_REQUESTS,
          windowHours: RATE_LIMIT_WINDOW_HOURS,
          remainingRequests: rateLimitResult.remainingRequests,
          resetTime: rateLimitResult.resetTime.toISOString()
        }
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
          'X-RateLimit-Reset': Math.floor(rateLimitResult.resetTime.getTime() / 1000).toString()
        },
        status: 429,
      });
    }

    const { repoUrl }: ScanRequest = await req.json();
    
    console.log('Starting AI-powered scan for repository:', repoUrl);
    
    // Parse GitHub URL
    const repoInfo = await parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error('Invalid GitHub repository URL');
    }

    const { owner, repo } = repoInfo;
    console.log(`Scanning repository: ${owner}/${repo}`);

    // Fetch repository structure and commit SHA
    const { files, commitSha } = await fetchRepositoryFiles(owner, repo);
    
    // Check for cached results first
    const cachedResults = await getCachedResults(owner, repo, commitSha);
    if (cachedResults) {
      console.log('Returning cached results for repository:', `${owner}/${repo}`, 'commit:', commitSha);
      
      await recordRateLimit(userId);
      
      return new Response(JSON.stringify({
        success: true,
        results: cachedResults.results,
        securityScore: cachedResults.security_score,
        filesScanned: cachedResults.files_scanned,
        repository: `${owner}/${repo}`,
        analysisMethod: 'AI-Powered (Cached)',
        commitSha,
        scanMetadata: cachedResults.scan_metadata
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Filter and prioritize files to scan with deterministic sorting
    const codeFiles = files.filter(file => 
      file.type === 'blob' && 
      /\.(js|ts|jsx|tsx|py|java|php|rb|go|rs|cpp|c|h|cs|swift|kt|scala|json|yaml|yml|env|config)$/i.test(file.path) &&
      file.size < 500000 // Skip files larger than 500KB
    )
    .sort((a, b) => {
      // Deterministic sorting: first by sensitivity score, then by path
      const sensitivePatterns = ['config', 'env', 'secret', 'key', 'auth', 'security', 'password', 'token'];
      const getSensitivityScore = (path: string) => {
        const lowerPath = path.toLowerCase();
        return sensitivePatterns.reduce((score, pattern) => {
          return lowerPath.includes(pattern) ? score + 1 : score;
        }, 0);
      };
      
      const aScore = getSensitivityScore(a.path);
      const bScore = getSensitivityScore(b.path);
      
      if (aScore !== bScore) {
        return bScore - aScore; // Higher sensitivity first
      }
      
      // Secondary sort by path for deterministic ordering
      return a.path.localeCompare(b.path);
    })
    .slice(0, 25); // Limit to 25 files for API cost management

    console.log(`Found ${codeFiles.length} code files to analyze with AI`);

    const allResults: ScanResult[] = [];
    const contentHashes: { [file: string]: string } = {};
    const filesAnalyzed: string[] = [];

    // Analyze each file with AI
    for (const file of codeFiles) {
      try {
        const content = await fetchFileContent(owner, repo, file.path);
        if (content.length > 0) {
          const contentHash = createContentHash(content);
          contentHashes[file.path] = contentHash;
          filesAnalyzed.push(file.path);
          
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

    // Deduplicate results to remove duplicates
    const deduplicatedResults = deduplicateResults(allResults);

    // Calculate security score with deduplicated results
    const securityScore = calculateSecurityScore(deduplicatedResults);

    // Create scan metadata
    const scanMetadata = {
      files_analyzed: filesAnalyzed,
      content_hashes: contentHashes,
      analysis_timestamp: new Date().toISOString()
    };

    // Cache the results for future use
    await storeCachedResults(owner, repo, commitSha, deduplicatedResults, securityScore, codeFiles.length, scanMetadata);

    // Record successful scan for rate limiting
    await recordRateLimit(userId);

    console.log(`AI scan complete. Found ${deduplicatedResults.length} unique issues (${allResults.length} before deduplication).`);

    return new Response(JSON.stringify({
      success: true,
      results: deduplicatedResults,
      securityScore,
      filesScanned: codeFiles.length,
      repository: `${owner}/${repo}`,
      analysisMethod: 'AI-Powered',
      commitSha,
      scanMetadata,
      issuesBeforeDeduplication: allResults.length
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