import { ReactNode, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, BookOpen, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityTip {
  title: string;
  description: string;
  example?: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'critical';
  learnMoreUrl?: string;
}

interface EnhancedTooltipProps {
  children: ReactNode;
  tip: SecurityTip;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

const severityIcons = {
  info: "ℹ️",
  warning: "⚠️", 
  critical: "🔴"
};

const severityColors = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30"
};

export const EnhancedTooltip = ({ 
  children, 
  tip, 
  side = "top", 
  delayDuration = 300 
}: EnhancedTooltipProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const copyExample = () => {
    if (tip.example) {
      navigator.clipboard.writeText(tip.example);
      toast({
        title: "Code copied",
        description: "Example code copied to clipboard.",
      });
    }
  };

  const openLearnMore = () => {
    if (tip.learnMoreUrl) {
      window.open(tip.learnMoreUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="p-0 border-border/50 bg-transparent shadow-lg max-w-md"
          sideOffset={8}
        >
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{severityIcons[tip.severity]}</span>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {tip.title}
                  </CardTitle>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${severityColors[tip.severity]}`}
                >
                  {tip.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tip.description}
              </p>
              
              {tip.example && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Example</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyExample}
                      className="h-6 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted/50 p-2 rounded border overflow-x-auto">
                    <code className="text-muted-foreground">{tip.example}</code>
                  </pre>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Recommendation</span>
                </div>
                <p className="text-xs text-foreground bg-primary/10 p-2 rounded border border-primary/20">
                  {tip.recommendation}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {isExpanded ? 'Show Less' : 'Learn More'}
                </button>
                
                {tip.learnMoreUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openLearnMore}
                    className="h-6 px-2 text-xs gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Docs
                  </Button>
                )}
              </div>
              
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-border/50 animate-fade-in">
                  <h4 className="text-xs font-semibold text-foreground">Common Attack Vectors</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                    <li>• Code injection through unsanitized input</li>
                    <li>• Data exposure through error messages</li>
                    <li>• Privilege escalation via parameter tampering</li>
                  </ul>
                  
                  <h4 className="text-xs font-semibold text-foreground pt-2">Prevention Steps</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                    <li>• Always validate and sanitize user input</li>
                    <li>• Use parameterized queries for database operations</li>
                    <li>• Implement proper error handling</li>
                    <li>• Apply principle of least privilege</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};