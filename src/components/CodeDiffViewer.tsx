import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface CodeDiffViewerProps {
  diffs: CodeDiff[];
}

const severityColors = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
} as const;

export const CodeDiffViewer = ({ diffs }: CodeDiffViewerProps) => {
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [showBefore, setShowBefore] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleDiff = (id: string) => {
    const newExpanded = new Set(expandedDiffs);
    if (expandedDiffs.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDiffs(newExpanded);
  };

  const toggleView = (id: string) => {
    setShowBefore(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied",
      description: "The code has been copied to your clipboard.",
    });
  };

  const renderCode = (code: string, language: string, isExpanded: boolean) => {
    if (!isExpanded) return null;

    return (
      <pre className="rounded-lg p-4 overflow-x-auto text-sm bg-muted/50 border">
        <code className="text-muted-foreground font-mono whitespace-pre">
          {code.split('\n').map((line, i) => (
            <div key={i} className="table-row">
              <span className="table-cell text-right pr-4 select-none opacity-50 text-xs">
                {i + 1}
              </span>
              <span className="table-cell">
                {line}
              </span>
            </div>
          ))}
        </code>
      </pre>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Security Fixes & Recommendations
        </CardTitle>
        <p className="text-muted-foreground">
          Review suggested security improvements with before/after code examples
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {diffs.map((diff) => {
          const isExpanded = expandedDiffs.has(diff.id);
          const showingBefore = showBefore[diff.id];
          
          return (
            <Card key={diff.id} className="border-border/50 bg-background/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => toggleDiff(diff.id)}
                        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold">{diff.title}</span>
                      </button>
                      <Badge variant={severityColors[diff.severity]} className="text-xs">
                        {diff.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{diff.description}</p>
                    <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                      {diff.file}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                    <h4 className="font-semibold text-foreground mb-2">💡 Recommendation</h4>
                    <p className="text-sm text-muted-foreground">{diff.suggestion}</p>
                  </div>
                )}
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleView(diff.id)}
                          className="text-xs"
                        >
                          {showingBefore ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                          {showingBefore ? 'Show Fixed' : 'Show Original'}
                        </Button>
                        <Badge variant="outline" className="text-xs">
                          {showingBefore ? 'Before (Vulnerable)' : 'After (Secure)'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(showingBefore ? diff.before : diff.after)}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <div className={`transition-all duration-300 ${showingBefore ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                        {renderCode(diff.before, diff.language, true)}
                      </div>
                      <div className={`transition-all duration-300 ${!showingBefore ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                        {renderCode(diff.after, diff.language, true)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        
        {diffs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                ✓
              </div>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">No Security Issues Found</p>
            <p>Your code appears to follow security best practices!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};