import { Shield, Lock, Eye, Database } from "lucide-react";

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

        <div className="mt-16 p-8 bg-background/80 rounded-xl border border-border/50">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-foreground">
              How We Protect Your Data
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">During Analysis:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Code is processed in secure, isolated environments</li>
                  <li>• Sensitive patterns are detected and redacted in real-time</li>
                  <li>• Only security findings are stored, never source code</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">After Scanning:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All data is encrypted using industry-standard AES-256</li>
                  <li>• Results are tied to your account with strict access controls</li>
                  <li>• Automatic cleanup of old scan data after 30 days</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;