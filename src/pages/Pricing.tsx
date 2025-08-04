import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Check, Star, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
const Pricing = () => {
  const { user, session, subscriptionInfo, refreshSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  // Stripe Price IDs - replace these with your actual Stripe price IDs
  const stripePriceIds = {
    "Solo Developer": "price_1QawJ3BlYgOVVgTc4ELKp46H", // $9.99/month
    "Professional": "price_1QawJ3BlYgOVVgTc4ELKp47I",   // $19.99/month  
    "Startup": "price_1QawJ3BlYgOVVgTc4ELKp48J"         // $29.99/month
  };

  const pricingTiers = [{
    name: "Solo Developer",
    price: 9.99,
    description: "For indie devs who want to stay secure across multiple projects",
    icon: <Star className="h-6 w-6" />,
    features: ["25 scans/month", "Secret detection", "Security score", "7-day free trial"],
    buttonText: "Start 7-Day Trial",
    popular: false
  }, {
    name: "Professional",
    price: 19.99,
    description: "For developers with more frequent scanning needs",
    icon: <Users className="h-6 w-6" />,
    features: ["50 scans/month", "Secret detection", "Security score", "7-day free trial"],
    buttonText: "Start 7-Day Trial",
    popular: true
  }, {
    name: "Startup",
    price: 29.99,
    description: "For teams that want ongoing visibility across repos",
    icon: <Users className="h-6 w-6" />,
    features: ["100 scans/month", "Secret detection", "Security score", "7-day free trial"],
    buttonText: "Start 7-Day Trial",
    popular: false
  }];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Welcome to your free trial!",
        description: "Your subscription is now active. Enjoy your 7-day free trial!",
      });
      refreshSubscription();
    } else if (urlParams.get('canceled') === 'true') {
      toast({
        title: "Payment canceled",
        description: "No worries! Your payment was canceled.",
      });
    }
  }, []);

  const handleSubscribe = async (tierName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      return;
    }

    const priceId = stripePriceIds[tierName as keyof typeof stripePriceIds];
    if (!priceId) {
      toast({
        title: "Error",
        description: "Price not found for this plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(tierName);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error", 
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  return <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your development workflow.</p>
            
            {/* Subscription Status */}
            {subscriptionInfo.subscribed && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Current Plan: {subscriptionInfo.subscription_tier}
                  </Badge>
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
                {subscriptionInfo.subscription_end && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Next billing: {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {pricingTiers.map((tier, index) => {
              const isCurrentPlan = subscriptionInfo.subscribed && subscriptionInfo.subscription_tier === tier.name;
              return (
                <Card key={tier.name} className={`relative ${tier.popular || isCurrentPlan ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                  {tier.popular && !isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white">
                      Your Plan
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
                    {tier.features.map((feature, featureIndex) => <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>)}
                  </ul>
                </CardContent>

                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isCurrentPlan ? "secondary" : (tier.popular ? "default" : "outline")}
                      onClick={() => handleSubscribe(tier.name)}
                      disabled={loading === tier.name || isCurrentPlan}
                    >
                      {loading === tier.name ? "Processing..." : isCurrentPlan ? "Current Plan" : tier.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
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
                  All plans include a 7-day free trial. Payment information is required to start your trial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>;
};
export default Pricing;