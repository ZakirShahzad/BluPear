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
  sanitized?: boolean;
  sensitive_data_types?: string[];
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

// Sanitization patterns for sensitive data
const SENSITIVE_PATTERNS = {
  api_keys: [
    /['"]((?:sk|pk)_[a-zA-Z0-9]{20,})['"]/gi,
    /['"](AKIA[0-9A-Z]{16})['"]/gi,
    /['"](ya29\.[0-9A-Za-z\-_]{68})['"]/gi,
    /['"](AIza[0-9A-Za-z\-_]{35})['"]/gi,
    /['"](xox[baprs]-[0-9]{10,12}-[0-9]{10,12}-[0-9a-zA-Z]{24})['"]/gi
  ],
  passwords: [
    /password\s*[:=]\s*['"]([^'"]{8,})['"]?/gi,
    /pwd\s*[:=]\s*['"]([^'"]{8,})['"]?/gi,
    /pass\s*[:=]\s*['"]([^'"]{8,})['"]?/gi
  ],
  tokens: [
    /['"](ghp_[a-zA-Z0-9]{36})['"]/gi,
    /['"](gho_[a-zA-Z0-9]{36})['"]/gi,
    /['"](github_pat_[a-zA-Z0-9_]{82})['"]/gi,
    /bearer\s+([a-zA-Z0-9\-_.~+/]+=*)/gi
  ],
  emails: [
    /[\w\.-]+@[\w\.-]+\.\w+/gi
  ],
  database_urls: [
    /(mongodb|mysql|postgresql|postgres):\/\/[^\s'"]+/gi,
    /database_url\s*[:=]\s*['"]([^'"]+)['"]?/gi
  ],
  private_keys: [
    /-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+|EC\s+|DSA\s+)?PRIVATE\s+KEY-----/gi,
    /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/gi
  ]
};

// Sanitize sensitive data from content
function sanitizeContent(content: string): { sanitized: string; detectedTypes: string[] } {
  let sanitized = content;
  const detectedTypes: string[] = [];

  for (const [type, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        detectedTypes.push(type);
        sanitized = sanitized.replace(pattern, (match, ...groups) => {
          // For patterns with capture groups, replace the sensitive part
          if (groups.length > 0 && groups[0]) {
            const sensitiveValue = groups[0];
            const replacement = '[REDACTED_' + type.toUpperCase() + '_' + sensitiveValue.length + '_CHARS]';
            return match.replace(sensitiveValue, replacement);
          }
          // For full matches, replace with a generic placeholder
          return '[REDACTED_' + type.toUpperCase() + ']';
        });
      }
    }
  }

  return { sanitized, detectedTypes };
}

// Sanitize scan results to remove sensitive data
function sanitizeScanResults(results: ScanResult[]): ScanResult[] {
  return results.map(result => {
    const { sanitized: sanitizedDescription, detectedTypes: descTypes } = sanitizeContent(result.description);
    const { sanitized: sanitizedSuggestion, detectedTypes: suggTypes } = sanitizeContent(result.suggestion || '');
    const { sanitized: sanitizedImpact, detectedTypes: impactTypes } = sanitizeContent(result.impact || '');
    
    const allDetectedTypes = [...new Set([...descTypes, ...suggTypes, ...impactTypes])];
    const wasSanitized = allDetectedTypes.length > 0;

    return {
      ...result,
      description: sanitizedDescription,
      suggestion: sanitizedSuggestion,
      impact: sanitizedImpact,
      sanitized: wasSanitized,
      sensitive_data_types: wasSanitized ? allDetectedTypes : undefined
    };
  });
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
    const prompt = `You are a senior cybersecurity expert specializing in comprehensive vulnerability assessment and code security analysis. Analyze the following source code for security vulnerabilities with exceptional detail and precision.

TASK: Perform a comprehensive security analysis of the ${fileType} file and return ONLY a valid JSON array with detailed findings that include SPECIFIC CODE EXAMPLES for fixes.

ENHANCED ANALYSIS FRAMEWORK:
1. SECRETS & CREDENTIALS: Hardcoded API keys, passwords, tokens, certificates, database credentials, encryption keys
2. INJECTION VULNERABILITIES: SQL injection, NoSQL injection, LDAP injection, OS command injection, code injection, XSS
3. AUTHENTICATION & AUTHORIZATION: Broken authentication, session management flaws, privilege escalation, insecure direct object references
4. CRYPTOGRAPHIC ISSUES: Weak algorithms, improper key management, insecure random number generation, weak hashing
5. INPUT VALIDATION: XSS, CSRF, path traversal, file upload vulnerabilities, deserialization attacks, buffer overflows
6. CONFIGURATION SECURITY: Debug modes, verbose error messages, insecure defaults, missing security headers
7. BUSINESS LOGIC FLAWS: Race conditions, workflow bypasses, insufficient rate limiting, timing attacks
8. INFORMATION DISCLOSURE: Sensitive data exposure, error message leakage, logging sensitive information
9. DEPENDENCY VULNERABILITIES: Outdated packages, known CVEs, supply chain risks
10. INFRASTRUCTURE SECURITY: Container misconfigurations, cloud security issues, deployment vulnerabilities

SEVERITY CLASSIFICATION (Enhanced):
- CRITICAL: Immediate exploit risk, data breach potential, system compromise (RCE, exposed secrets, auth bypass, complete system takeover)
- HIGH: Serious security impact, user data at risk (XSS, SQL injection, privilege escalation, sensitive data exposure)  
- MEDIUM: Security weakness, potential for exploitation (weak crypto, CSRF, info disclosure, improper validation)
- LOW: Security best practice violation, hardening opportunity (deprecated functions, weak configs, missing headers)

FILE: ${filename}
CONTENT:
\`\`\`${fileType}
${content.slice(0, 15000)}
\`\`\`

For each security issue identified, provide ENHANCED OUTPUT with SPECIFIC CODE EXAMPLES:
{
  "type": "secret|vulnerability|misconfiguration|pattern|dependency",
  "severity": "critical|high|medium|low",
  "title": "Specific, technical issue title",
  "description": "Comprehensive explanation including: 1) What the vulnerability is, 2) Why it's dangerous, 3) How it could be exploited, 4) What data/systems are at risk, 5) Real-world attack scenarios, 6) CVSS score estimation",
  "line": line_number_if_identifiable,
  "vulnerableCode": "EXACT vulnerable code snippet from the file",
  "fixedCode": "COMPLETE secure replacement code with proper implementation",
  "remediation": "Detailed step-by-step fix instructions including: 1) Immediate mitigation steps, 2) Proper implementation example, 3) Additional security considerations, 4) Testing/verification steps, 5) Prevention strategies for future development",
  "impact": "Detailed explanation of potential business and technical impact including data at risk and compliance implications",
  "exploitability": "high|medium|low - how easily this could be exploited",
  "businessRisk": "critical|high|medium|low - business impact assessment",
  "cwe_reference": "Common Weakness Enumeration ID if applicable (e.g., CWE-79, CWE-89)",
  "owasp_category": "OWASP Top 10 category if applicable (e.g., A03:2021 - Injection)",
  "compliance_impact": ["GDPR", "HIPAA", "PCI-DSS", "SOX"] - applicable compliance frameworks
}

CRITICAL REQUIREMENTS:
- Provide EXACT vulnerable code snippets from the actual file content
- Include COMPLETE, production-ready secure replacement code
- Explain WHY each fix addresses the security issue
- Consider code context and dependencies when suggesting fixes
- Include error handling and validation in fixed code examples
- Reference specific line numbers where possible
- Provide realistic attack scenarios with technical details
- Consider both immediate fixes and architectural improvements
- If no issues found, return empty array []
- Return ONLY valid JSON, no explanations or markdown outside the JSON structure

FOCUS ON: Real, exploitable vulnerabilities with concrete evidence from the code, not theoretical issues.`;

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
  
  // Overall score is the average of all category scores
  const overall = (secrets + vulnerabilities + configurations + patterns) / 4;

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
      
      // Increment scan count for cached results too
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { error: incrementError } = await supabase.rpc('increment_scan_count', {
          p_user_id: userId
        });
        
        if (incrementError) {
          console.error('Error incrementing scan count for cached result:', incrementError);
        } else {
          console.log('Scan count incremented successfully for cached result, user:', userId);
        }
      } catch (incrementErr) {
        console.error('Failed to increment scan count for cached result:', incrementErr);
      }
      
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
        let content = await fetchFileContent(owner, repo, file.path);
        if (content.length > 0) {
          const contentHash = createContentHash(content);
          contentHashes[file.path] = contentHash;
          filesAnalyzed.push(file.path);
          
          // Sanitize content before AI analysis to prevent sensitive data from being sent to OpenAI
          const { sanitized: sanitizedContent } = sanitizeContent(content);
          
          const fileType = getFileType(file.path);
          const fileResults = await analyzeCodeWithAI(sanitizedContent, file.path, fileType);
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

    // Sanitize scan results before storage and response
    const sanitizedResults = sanitizeScanResults(deduplicatedResults);

    // Calculate security score with sanitized results
    const securityScore = calculateSecurityScore(sanitizedResults);

    // Create scan metadata
    const scanMetadata = {
      files_analyzed: filesAnalyzed,
      content_hashes: contentHashes,
      analysis_timestamp: new Date().toISOString()
    };

    // Cache the sanitized results for future use
    await storeCachedResults(owner, repo, commitSha, sanitizedResults, securityScore, codeFiles.length, scanMetadata);

    // Record successful scan for rate limiting
    await recordRateLimit(userId);

    // Increment scan count for the user
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { error: incrementError } = await supabase.rpc('increment_scan_count', {
        p_user_id: userId
      });
      
      if (incrementError) {
        console.error('Error incrementing scan count:', incrementError);
      } else {
        console.log('Scan count incremented successfully for user:', userId);
      }
    } catch (incrementErr) {
      console.error('Failed to increment scan count:', incrementErr);
    }

    // Count how many results were sanitized
    const sanitizedCount = sanitizedResults.filter(r => r.sanitized).length;
    
    console.log(`AI scan complete. Found ${sanitizedResults.length} unique issues (${allResults.length} before deduplication). ${sanitizedCount} results had sensitive data sanitized.`);

    return new Response(JSON.stringify({
      success: true,
      results: sanitizedResults,
      securityScore,
      filesScanned: codeFiles.length,
      repository: `${owner}/${repo}`,
      analysisMethod: 'AI-Powered',
      commitSha,
      scanMetadata,
      issuesBeforeDeduplication: allResults.length,
      sanitizedIssues: sanitizedCount
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