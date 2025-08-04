import { Shield, Lock, Eye, Database, Clock, Server } from "lucide-react";

const PrivacySection = () => {
  const privacyFeatures = [
    {
      icon: Shield,
      title: "Data Sanitization",
      description: "All sensitive data is automatically detected and redacted before storage or analysis."
    },
    {
      icon: Lock,
      title: "Encrypted Storage",
      description: "Your scan results are encrypted and stored securely with enterprise-grade protection."
    },
    {
      icon: Eye,
      title: "No Code Retention",
      description: "We analyze your code but never store the actual source code on our servers."
    },
    {
      icon: Database,
      title: "User-Controlled Data",
      description: "You own your data. Delete your reports anytime with complete data removal."
    }
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold text-foreground">
            Your Privacy Matters
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We understand that security analysis requires trust. That's why we've built BluPear 
            with privacy-first principles to protect your code and data at every step.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {privacyFeatures.map((feature, index) => (
            <div
              key={index}
              className="text-center space-y-4 p-6 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
            >
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-gradient-to-br from-background to-muted/30 rounded-2xl border border-border/50 shadow-lg">
          <div className="text-center space-y-6 mb-8">
            <h3 className="text-2xl font-bold text-foreground">
              How We Protect Your Data
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our multi-layered security approach ensures your code and data remain private and secure throughout the entire scanning process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background/60 rounded-xl p-6 border border-border/30 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">During Analysis</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">Code is processed in secure, isolated environments with no external access</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">Sensitive patterns are detected and redacted in real-time using advanced AI</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">Only security findings are stored, never your actual source code</p>
                </div>
              </div>
            </div>

            <div className="bg-background/60 rounded-xl p-6 border border-border/30 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">After Scanning</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">All data is encrypted using industry-standard AES-256 encryption</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">Results are tied to your account with strict access controls and RLS policies</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">Automatic cleanup of old scan data after 30 days for enhanced privacy</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Zero-Retention Policy</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your code is analyzed in memory only and is never written to disk or stored permanently. 
              Once the scan completes, all traces of your source code are immediately purged from our systems.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;