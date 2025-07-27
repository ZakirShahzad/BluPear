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
  ArrowRight
} from "lucide-react";

export const HeroSection = () => {
  const scrollToScanner = () => {
    const scannerElement = document.getElementById('scanner-section');
    if (scannerElement) {
      scannerElement.scrollIntoView({ behavior: 'smooth' });
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
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Advanced Security Scanning
            </Badge>
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

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm">Secret Detection</span>
            </div>
            <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm">Vulnerability Audit</span>
            </div>
            <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2">
              <Lock className="h-4 w-4 text-success" />
              <span className="text-sm">Security Patterns</span>
            </div>
            <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-full px-4 py-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm">AI-Powered</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={scrollToScanner}
              variant="cyber" 
              size="lg"
              className="text-lg px-8 py-6"
            >
              <Github className="h-5 w-5 mr-2" />
              Scan Repository
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/10"
            >
              View Demo
            </Button>
          </div>

          {/* Security Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Repositories Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Secrets Detected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
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