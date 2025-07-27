import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Bug
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export const SecurityScanner = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const { toast } = useToast();

  const mockScanResults: ScanResult[] = [
    {
      id: "1",
      type: "secret",
      severity: "critical",
      title: "Exposed OpenAI API Key",
      description: "Hardcoded API key found in source code",
      file: "src/config/api.js",
      line: 12,
      suggestion: "Move API keys to environment variables and use proper secret management"
    },
    {
      id: "2", 
      type: "vulnerability",
      severity: "high",
      title: "Vulnerable lodash version",
      description: "Using lodash@4.17.15 with known security vulnerabilities",
      file: "package.json",
      suggestion: "Update to lodash@4.17.21 or higher"
    },
    {
      id: "3",
      type: "misconfiguration", 
      severity: "medium",
      title: "Debug mode enabled",
      description: "Application is running with debug flags in production build",
      file: "webpack.config.js",
      line: 45,
      suggestion: "Disable debug mode for production builds"
    },
    {
      id: "4",
      type: "pattern",
      severity: "low", 
      title: "Insecure randomness",
      description: "Using Math.random() for security-sensitive operations",
      file: "src/utils/token.js",
      line: 8,
      suggestion: "Use crypto.getRandomValues() for cryptographic randomness"
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

    setIsScanning(true);
    setScanProgress(0);
    setResults([]);
    setSecurityScore(null);

    // Simulate scanning process
    const scanSteps = [
      "Cloning repository...",
      "Scanning for secrets...", 
      "Analyzing dependencies...",
      "Checking configurations...",
      "Detecting insecure patterns...",
      "Generating security report..."
    ];

    for (let i = 0; i < scanSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setScanProgress((i + 1) * (100 / scanSteps.length));
      
      toast({
        title: "Scanning Progress",
        description: scanSteps[i]
      });
    }

    setResults(mockScanResults);
    setSecurityScore(mockSecurityScore);
    setIsScanning(false);

    toast({
      title: "Scan Complete",
      description: `Found ${mockScanResults.length} security issues`,
      variant: "default"
    });
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
              disabled={isScanning}
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

          {isScanning && (
            <div className="space-y-2">
              <Progress value={scanProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {scanProgress.toFixed(0)}% complete
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Security Score */}
      {securityScore && (
        <Card className="p-6 shadow-card border-border/50">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Score
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center space-y-2">
                <div className={`text-3xl font-bold ${getScoreColor(securityScore.overall)}`}>
                  {securityScore.overall}
                </div>
                <div className="text-sm text-muted-foreground">Overall</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className={`text-2xl font-semibold ${getScoreColor(securityScore.secrets)}`}>
                  {securityScore.secrets}
                </div>
                <div className="text-sm text-muted-foreground">Secrets</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className={`text-2xl font-semibold ${getScoreColor(securityScore.vulnerabilities)}`}>
                  {securityScore.vulnerabilities}
                </div>
                <div className="text-sm text-muted-foreground">Dependencies</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className={`text-2xl font-semibold ${getScoreColor(securityScore.configurations)}`}>
                  {securityScore.configurations}
                </div>
                <div className="text-sm text-muted-foreground">Config</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className={`text-2xl font-semibold ${getScoreColor(securityScore.patterns)}`}>
                  {securityScore.patterns}
                </div>
                <div className="text-sm text-muted-foreground">Patterns</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Scan Results */}
      {results.length > 0 && (
        <Card className="p-6 shadow-card border-border/50">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Security Issues ({results.length})
            </h3>
            
            <div className="space-y-3">
              {results.map((result) => (
                <div key={result.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(result.severity)}
                      {getTypeIcon(result.type)}
                      <div>
                        <h4 className="font-medium">{result.title}</h4>
                        <p className="text-sm text-muted-foreground">{result.description}</p>
                      </div>
                    </div>
                    <Badge variant={result.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {result.severity}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{result.file}</span>
                    {result.line && <span className="ml-1">line {result.line}</span>}
                  </div>
                  
                  {result.suggestion && (
                    <div className="bg-muted/50 p-3 rounded border border-border/30">
                      <h5 className="text-sm font-medium text-primary mb-1">Recommendation:</h5>
                      <p className="text-sm text-muted-foreground">{result.suggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};