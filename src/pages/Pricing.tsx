import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Zap } from "lucide-react";

const Pricing = () => {
  const pricingTiers = [
    {
      name: "Starter",
      price: 0,
      description: "For indie devs testing BluPear or securing a side project",
      icon: <Zap className="h-6 w-6" />,
      features: [
        "5 scans/month",
        "Public GitHub repos only",
        "Secret detection (API keys, tokens, .env files)",
        "Basic security score",
        "Manual scan only"
      ],
      buttonText: "Get Started Free",
      popular: false
    },
    {
      name: "Solo Developer",
      price: 9,
      description: "For indie devs who want to stay secure across multiple projects",
      icon: <Star className="h-6 w-6" />,
      features: [
        "25 scans/month",
        "Private repo support",
        "Secret detection + config missteps (debug flags, Firebase)",
        "Downloadable scan report (PDF/Markdown)",
        "GPT-powered risk explanation (up to 3 per scan)",
        "GitHub PR auto-scan (optional)"
      ],
      buttonText: "Start Pro Trial",
      popular: true
    },
    {
      name: "Startup",
      price: 29,
      description: "For lean teams that want ongoing visibility across repos",
      icon: <Users className="h-6 w-6" />,
      features: [
        "100 scans/month (shared across team)",
        "Up to 3 team members",
        "GitHub App auto-scan on push/PR",
        "Email alerts for high-severity issues",
        "GPT-powered suggestions (up to 10 per scan)",
        "Scan logs & score tracking"
      ],
      buttonText: "Start Team Trial",
      popular: false
    }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Secure your code with our scan-first, lean approach. Choose the plan that fits your development workflow.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={tier.name} 
                className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {tier.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                  <CardDescription className="text-center mt-2">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Add-on Section */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-border">
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">Extra Scans Pack</CardTitle>
                <div className="flex items-baseline justify-center">
                  <span className="text-2xl font-bold">+$5</span>
                  <span className="text-muted-foreground ml-1">for 25 more scans/month</span>
                </div>
                <CardDescription>
                  Need more scans? Add extra capacity to any paid plan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">25 additional scans per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">Works with Pro and Team plans</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">Can purchase multiple packs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="text-center mt-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-left">
                <h3 className="font-semibold mb-2">What counts as a scan?</h3>
                <p className="text-muted-foreground text-sm">
                  Each repository analysis counts as one scan, regardless of size or number of files.
                </p>
              </div>
              <div className="text-left">
                <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, you can change your plan at any time. Changes take effect on your next billing cycle.
                </p>
              </div>
              <div className="text-left">
                <h3 className="font-semibold mb-2">What happens if I exceed my scan limit?</h3>
                <p className="text-muted-foreground text-sm">
                  You'll be prompted to upgrade or purchase additional scan packs to continue scanning.
                </p>
              </div>
              <div className="text-left">
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground text-sm">
                  The Starter plan is free forever. Pro and Team plans include a 14-day free trial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;