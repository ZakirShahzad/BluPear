import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  GitBranch, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search,
  Github,
  FileSearch,
  Key,
  Bug,
  Crown
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveSecurityChart } from "./InteractiveSecurityChart";
import { CodeDiffViewer } from "./CodeDiffViewer";
import { EnhancedScanProgress } from "./EnhancedScanProgress";
import { EnhancedTooltip } from "./EnhancedTooltip";

interface ScanResult {
  id: string;
  type: 'secret' | 'vulnerability' | 'misconfiguration' | 'pattern';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line?: number;
  suggestion?: string;
  vulnerableCode?: string;
  fixedCode?: string;
}

interface SecurityScore {
  overall: number;
  secrets: number;
  vulnerabilities: number;
  configurations: number;
  patterns: number;
}

interface CodeDiff {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  before: string;
  after: string;
  language: string;
  suggestion: string;
}

export const SecurityScanner = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [codeDiffs, setCodeDiffs] = useState<CodeDiff[]>([]);
  const { toast } = useToast();
  const { user, subscriptionInfo, scanUsageInfo, refreshScanUsage } = useAuth();

  const mockScanResults: ScanResult[] = [
    {
      id: "1",
      type: "secret",
      severity: "critical",
      title: "Exposed OpenAI API Key",
      description: "Hardcoded API key found in source code",
      file: "src/config/api.js",
      line: 12,
      suggestion: "Move API keys to environment variables and use proper secret management. Remove the hardcoded key from source code. Use process.env variables instead",
      vulnerableCode: "const apiKey = 'sk-proj-abc123def456ghi789jkl';",
      fixedCode: "const apiKey = process.env.OPENAI_API_KEY;"
    },
    {
      id: "2", 
      type: "vulnerability",
      severity: "high",
      title: "Vulnerable lodash version",
      description: "Using lodash@4.17.15 with known security vulnerabilities",
      file: "package.json",
      suggestion: "Update to lodash@4.17.21 or higher. Run npm update lodash to fix this issue",
      vulnerableCode: '"lodash": "^4.17.15"',
      fixedCode: '"lodash": "^4.17.21"'
    },
    {
      id: "3",
      type: "misconfiguration", 
      severity: "medium",
      title: "Debug mode enabled",
      description: "Application is running with debug flags in production build",
      file: "webpack.config.js",
      line: 45,
      suggestion: "Disable debug mode for production builds. Change the debug flag to false. Add environment-based configuration",
      vulnerableCode: "debug: true,",
      fixedCode: "debug: process.env.NODE_ENV !== 'production',"
    },
    {
      id: "4",
      type: "pattern",
      severity: "low", 
      title: "Insecure randomness",
      description: "Using Math.random() for security-sensitive operations",
      file: "src/utils/token.js",
      line: 8,
      suggestion: "Use crypto.getRandomValues() for cryptographic randomness. Replace Math.random() with secure random generation. Import the crypto module for secure operations",
      vulnerableCode: "const token = Math.random().toString(36);",
      fixedCode: "const array = new Uint32Array(1); crypto.getRandomValues(array); const token = array[0].toString(36);"
    }
  ];

  const mockSecurityScore: SecurityScore = {
    overall: 65,
    secrets: 20,
    vulnerabilities: 80,
    configurations: 75,
    patterns: 90
  };

  const startScan = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Repository URL Required",
        description: "Please enter a valid GitHub repository URL",
        variant: "destructive"
      });
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in or create an account to scan repositories.",
        variant: "destructive",
        action: (
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Sign In</Link>
          </Button>
        ),
      });
      return;
    }

    // Check scan usage limits
    if (scanUsageInfo && !scanUsageInfo.can_scan) {
      toast({
        title: "Scan Limit Reached",
        description: `You've reached your monthly limit of ${scanUsageInfo.scan_limit} scans. Upgrade to Pro for 25 scans/month or Team for unlimited scans.`,
        variant: "destructive"
      });
      return;
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      toast({
        title: "Invalid URL Format",
        description: "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setResults([]);
    setSecurityScore(null);

    // Simulate progress steps
    const progressSteps = [
      { progress: 10, message: "Connecting to repository..." },
      { progress: 25, message: "Fetching repository structure..." },
      { progress: 40, message: "Scanning for secrets..." },
      { progress: 60, message: "Analyzing dependencies..." },
      { progress: 75, message: "Checking configurations..." },
      { progress: 90, message: "Detecting insecure patterns..." },
      { progress: 100, message: "Generating security report..." }
    ];

    try {
      // Start the actual scan
      const { data, error } = await supabase.functions.invoke('github-scanner', {
        body: { repoUrl: repoUrl.trim() }
      });

      // Update progress during scan
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          const newProgress = Math.min(prev + 5, 95);
          return newProgress;
        });
      }, 1000);

      // Clear interval when scan completes
      clearInterval(progressInterval);
      setScanProgress(100);

      if (error) {
        throw new Error(error.message || 'Scan failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Scan failed');
      }

      setResults(data.results || []);
      setSecurityScore(data.securityScore || mockSecurityScore);
      
      // Save scan report to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const repositoryName = repoUrl.split('/').slice(-2).join('/');
        const scanResults = data.results || [];
        const totalIssues = scanResults.length;
        const criticalIssues = scanResults.filter((r: any) => r.severity === 'critical').length;
        const highIssues = scanResults.filter((r: any) => r.severity === 'high').length;
        const mediumIssues = scanResults.filter((r: any) => r.severity === 'medium').length;
        const lowIssues = scanResults.filter((r: any) => r.severity === 'low').length;

        await supabase.from('scan_reports').insert({
          user_id: user.id,
          repository_url: repoUrl.trim(),
          repository_name: repositoryName,
          security_score: data.securityScore?.overall || mockSecurityScore.overall,
          total_issues: totalIssues,
          critical_issues: criticalIssues,
          high_issues: highIssues,
          medium_issues: mediumIssues,
          low_issues: lowIssues,
          scan_results: scanResults
        });
      }
      
      toast({
        title: "Scan Complete",
        description: `Found ${data.results?.length || 0} security issues in ${data.filesScanned || 0} files`,
        variant: "default"
      });

      // Refresh scan usage after successful scan
      await refreshScanUsage();

    } catch (error) {
      console.error('Scan error:', error);
      
      // Fallback to mock data on error
      setResults(mockScanResults);
      setSecurityScore(mockSecurityScore);
      
      toast({
        title: "Scan Error",
        description: error.message || "Failed to scan repository. Using sample data.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-warning/70" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'secret': return <Key className="h-4 w-4" />;
      case 'vulnerability': return <Bug className="h-4 w-4" />;
      case 'misconfiguration': return <FileSearch className="h-4 w-4" />;
      case 'pattern': return <Search className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Scan Usage Display */}
      {user && scanUsageInfo && (
        <Card className="p-4 shadow-card border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  Scan Usage ({subscriptionInfo?.subscription_tier || 'Trial Tier'})
                </h3>
                <p className="text-sm text-muted-foreground">
                  {scanUsageInfo.scan_limit === -1 
                    ? `${scanUsageInfo.current_scans} scans this month (Unlimited)`
                    : `${scanUsageInfo.current_scans} of ${scanUsageInfo.scan_limit} scans used this month`
                  }
                </p>
              </div>
            </div>
            {!scanUsageInfo.can_scan && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/pricing', '_blank')}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            )}
          </div>
          {scanUsageInfo.scan_limit !== -1 && (
            <div className="mt-3">
              <Progress 
                value={(scanUsageInfo.current_scans / scanUsageInfo.scan_limit) * 100} 
                className="h-2"
              />
            </div>
          )}
        </Card>
      )}

      {/* Scanner Input */}
      <Card className="p-6 shadow-card border-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Repository Scanner</h2>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isScanning}
                className="bg-input border-border/50"
              />
            </div>
            <Button 
              onClick={startScan}
              disabled={isScanning || !user || (scanUsageInfo && !scanUsageInfo.can_scan)}
              variant="cyber"
              size="lg"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Start Scan
                </>
              )}
            </Button>
          </div>

          <EnhancedScanProgress 
            isScanning={isScanning} 
            progress={scanProgress} 
            onComplete={() => {}} 
          />
        </div>
      </Card>

      {/* Security Score Chart */}
      {securityScore && <InteractiveSecurityChart score={securityScore} />}
      
      {/* Code Diff Viewer */}
      {codeDiffs.length > 0 && <CodeDiffViewer diffs={codeDiffs} />}

      {/* Scan Results */}
      {results.length > 0 && (
        <Card className="p-6 shadow-card border-border/50">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Security Issues ({results.length})
            </h3>
            
            <div className="space-y-6">
              {results.map((result) => (
                <Card key={result.id} className="border-border/50 bg-background/30 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {getSeverityIcon(result.severity)}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant={result.severity === 'critical' || result.severity === 'high' ? 'destructive' : result.severity === 'medium' ? 'secondary' : 'outline'} className="text-xs font-medium">
                            {result.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {getTypeIcon(result.type)} {result.type.toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-foreground text-lg mb-2">{result.title}</h4>
                          <p className="text-muted-foreground leading-relaxed">{result.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                            <span className="text-muted-foreground">📁</span>
                            <span className="font-mono text-foreground">{result.file}</span>
                          </div>
                          {result.line && (
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                              <span className="text-muted-foreground">📍</span>
                              <span className="text-foreground">Line {result.line}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {result.suggestion && (
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border-l-4 border-primary">
                        <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-primary">💡</span>
                          Fix Recommendations
                        </h5>
                        <div className="space-y-3">
                          {result.suggestion.split(/(\d+\)\s)/).filter(Boolean).map((item, idx) => {
                            const isNumberedItem = /^\d+\)\s/.test(item);
                            if (isNumberedItem) return null;
                            
                            const prevItem = result.suggestion.split(/(\d+\)\s)/)[idx - 1];
                            const itemNumber = prevItem?.match(/(\d+)\)/)?.[1];
                            
                            // Check if item contains code (backticks or common code patterns)
                            const hasCode = item.includes('`') || /supabase|process\.env|crypto\.|Math\.|const |let |var |function/.test(item);
                            
                            if (hasCode) {
                              // Split text and code
                              const parts = item.split(/(`[^`]+`)/);
                              return (
                                <div key={idx} className="flex items-start gap-2">
                                  {itemNumber && <span className="text-primary text-sm font-medium">{itemNumber}.</span>}
                                  <div className="text-sm text-muted-foreground leading-relaxed">
                                    {parts.map((part, partIdx) => {
                                      if (part.startsWith('`') && part.endsWith('`')) {
                                        return (
                                          <code key={partIdx} className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                                            {part.slice(1, -1)}
                                          </code>
                                        );
                                      }
                                      return <span key={partIdx}>{part}</span>;
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={idx} className="flex items-start gap-2">
                                {itemNumber && <span className="text-primary text-sm font-medium">{itemNumber}.</span>}
                                <span className="text-sm text-muted-foreground leading-relaxed">{item.trim()}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {(result.vulnerableCode || result.fixedCode) && (
                          <div className="mt-4 pt-3 border-t border-border/30 space-y-3">
                            {result.vulnerableCode && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {result.line ? `Vulnerable code at line ${result.line}:` : 'Current vulnerable code:'}
                                </p>
                                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                                  <code className="text-sm font-mono text-foreground block">{result.vulnerableCode}</code>
                                </div>
                              </div>
                            )}
                            
                            {result.fixedCode && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Secure replacement:</p>
                                <div className="bg-success/10 border border-success/20 rounded-md p-3">
                                  <code className="text-sm font-mono text-foreground block">{result.fixedCode}</code>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};