import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Github, 
  Zap, 
  Eye, 
  Lock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { SecurityShield3D } from "./SecurityShield3D";
import { EnhancedTooltip } from "./EnhancedTooltip";

export const HeroSection = () => {
  const securityTips = {
    secretDetection: {
      title: "Secret Detection",
      description: "Our AI-powered scanner identifies exposed API keys, passwords, and sensitive credentials in your codebase before they become security vulnerabilities.",
      example: "API_KEY=sk_live_xyz123",
      recommendation: "Use environment variables and secret management services like AWS Secrets Manager or HashiCorp Vault.",
      severity: "critical" as const,
      learnMoreUrl: "https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure"
    },
    vulnerabilityAudit: {
      title: "Security Analysis", 
      description: "AI-powered analysis of your code to identify potential security issues and vulnerabilities in your codebase.",
      example: "Insecure authentication patterns detected",
      recommendation: "Review identified security patterns and implement suggested fixes from our AI analysis.",
      severity: "warning" as const,
      learnMoreUrl: "https://owasp.org/www-project-top-ten/"
    },
    securityPatterns: {
      title: "Insecure Code Patterns",
      description: "Advanced static analysis detects common security anti-patterns like SQL injection vectors, XSS vulnerabilities, and insecure cryptographic implementations.",
      example: "SELECT * FROM users WHERE id = '" + "[userInput]" + "'",
      recommendation: "Use parameterized queries, input validation, and established security libraries.",
      severity: "critical" as const,
      learnMoreUrl: "https://owasp.org/www-project-top-ten/"
    },
    aiPowered: {
      title: "AI-Powered Analysis",
      description: "Machine learning models trained on security best practices provide intelligent recommendations and automated fix suggestions.",
      example: "Auto-generated secure code alternatives",
      recommendation: "Review AI suggestions carefully and test thoroughly before implementing fixes.",
      severity: "info" as const
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-security" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          
          {/* 3D Security Visualization */}
          <div className="mb-8">
            <SecurityShield3D />
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BluPear
            </h1>
            <h2 className="text-2xl md:text-4xl font-semibold text-foreground">
              Secure Your Code, Protect Your Future
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Advanced GitHub repository security scanner that detects exposed secrets, 
              vulnerabilities, and misconfigurations before they become threats.
            </p>
          </div>

          {/* Feature Pills with Enhanced Tooltips */}
          <div className="flex flex-wrap justify-center gap-3">
            <EnhancedTooltip tip={securityTips.secretDetection}>
              <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2 cursor-help hover:scale-105 transition-transform">
                <Search className="h-4 w-4 text-primary" />
                <span className="text-sm">Secret Detection</span>
              </div>
            </EnhancedTooltip>
            
            <EnhancedTooltip tip={securityTips.vulnerabilityAudit}>
              <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2 cursor-help hover:scale-105 transition-transform">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm">Security Analysis</span>
              </div>
            </EnhancedTooltip>
            
            <EnhancedTooltip tip={securityTips.securityPatterns}>
              <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2 cursor-help hover:scale-105 transition-transform">
                <Lock className="h-4 w-4 text-success" />
                <span className="text-sm">Security Patterns</span>
              </div>
            </EnhancedTooltip>
            
            <EnhancedTooltip tip={securityTips.aiPowered}>
              <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2 cursor-help hover:scale-105 transition-transform">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">AI-Powered</span>
              </div>
            </EnhancedTooltip>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              variant="cyber" 
              size="lg"
              className="text-lg px-8 py-6"
            >
              <Link to="/scanner">
                <Github className="h-5 w-5 mr-2" />
                Scan Repository
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">AI-Powered</div>
              <div className="text-sm text-muted-foreground">Advanced Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Real-time</div>
              <div className="text-sm text-muted-foreground">Instant Results</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Secure</div>
              <div className="text-sm text-muted-foreground">Privacy-First</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};