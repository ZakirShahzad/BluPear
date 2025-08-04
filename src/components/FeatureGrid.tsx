import { Card } from "@/components/ui/card";
import { 
  Key, 
  Bug, 
  FileSearch, 
  Shield, 
  Zap, 
  Brain,
  GitBranch,
  BarChart3
} from "lucide-react";

const features = [
  {
    icon: Key,
    title: "Secret Detection",
    description: "Advanced regex and entropy analysis to detect exposed API keys, tokens, and credentials in your codebase.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: Bug,
    title: "Security Pattern Detection",
    description: "AI-powered analysis to identify insecure coding patterns and potential security vulnerabilities.",
    gradient: "bg-gradient-alert"
  },
  {
    icon: FileSearch,
    title: "Configuration Analysis",
    description: "Detect misconfigurations like exposed .env files, debug modes, and insecure build settings.",
    gradient: "bg-gradient-success"
  },
  {
    icon: Shield,
    title: "Pattern Detection",
    description: "Identify insecure coding patterns using advanced static analysis and security linting rules.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "GPT-powered recommendations that explain security risks and provide actionable fixes.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: BarChart3,
    title: "Security Scoring",
    description: "Comprehensive security score with detailed breakdowns and improvement recommendations.",
    gradient: "bg-gradient-success"
  },
  {
    icon: GitBranch,
    title: "GitHub Repository Scanning",
    description: "Analyze any public GitHub repository by simply entering the repository URL.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: Zap,
    title: "Instant Security Reports",
    description: "Get detailed security analysis reports with clear findings and actionable recommendations.",
    gradient: "bg-gradient-alert"
  }
];

export const FeatureGrid = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-foreground">
            Comprehensive Security Analysis
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            BluPear combines multiple security scanning techniques to provide complete visibility 
            into your repository's security posture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 shadow-card border-border/50 hover:shadow-glow transition-all duration-300 hover:scale-105"
            >
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-lg ${feature.gradient} flex items-center justify-center shadow-cyber`}>
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};