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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
const Pricing = () => {
  const {
    user,
    session,
    subscriptionInfo,
    refreshSubscription
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  // Stripe Price IDs - replace these with your actual Stripe price IDs
  const stripePriceIds = {
    "Pro": "price_1QawJ3BlYgOVVgTc4ELKp46H",
    // $9.99/month
    "Team": "price_1QawJ3BlYgOVVgTc4ELKp48J" // $29.99/month
  };
  const pricingTiers = [{
    name: "Trial Tier",
    price: 0,
    description: "Perfect for getting started with security scanning",
    icon: <Star className="h-6 w-6" />,
    features: ["5 scans/month", "Basic security detection", "Security score", "Community support"],
    buttonText: "Get Started Free",
    popular: false,
    isFree: true
  }, {
    name: "Pro",
    price: 9.99,
    description: "For developers who need regular scanning",
    icon: <Users className="h-6 w-6" />,
    features: ["25 scans/month", "Advanced security detection", "Priority support", "Detailed reports"],
    buttonText: "Upgrade to Pro",
    popular: true,
    isFree: false
  }, {
    name: "Team",
    price: 29.99,
    description: "For teams that want unlimited scanning",
    icon: <Users className="h-6 w-6" />,
    features: ["Unlimited scans", "Advanced security detection", "Priority support", "Detailed reports"],
    buttonText: "Upgrade to Team",
    popular: false,
    isFree: false
  }];
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Welcome to your free trial!",
        description: "Your subscription is now active. Enjoy your 7-day free trial!"
      });
      refreshSubscription();
    } else if (urlParams.get('canceled') === 'true') {
      toast({
        title: "Payment canceled",
        description: "No worries! Your payment was canceled."
      });
    }
  }, []);
  const handleSubscribe = async (tierName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Handle trial tier
    if (tierName === "Trial Tier") {
      toast({
        title: "Welcome to the Trial Tier!",
        description: "You now have 5 free scans per month. Start scanning your repositories!"
      });
      navigate('/scanner');
      return;
    }
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe.",
        variant: "destructive"
      });
      return;
    }
    const priceId = stripePriceIds[tierName as keyof typeof stripePriceIds];
    if (!priceId) {
      toast({
        title: "Error",
        description: "Price not found for this plan.",
        variant: "destructive"
      });
      return;
    }
    setLoading(tierName);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };
  const handleManageSubscription = async () => {
    if (!session) return;
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleCancelSubscription = async () => {
    if (!session) return;
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      toast({
        title: "Subscription Canceled",
        description: data.message || "Your subscription has been canceled. You'll retain access until the end of your billing period."
      });

      // Refresh subscription status
      refreshSubscription();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
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
            {subscriptionInfo.subscribed && <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Current Plan: {subscriptionInfo.subscription_tier}
                  </Badge>
                  
                </div>
                {subscriptionInfo.subscription_end && <p className="text-sm text-muted-foreground mt-2">
                    Next billing: {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
                  </p>}
                <div className="flex gap-2 mt-4 justify-center">
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel your subscription? You'll retain access to your current plan until the end of your billing period, after which you'll be moved to the Trial Tier with 5 scans per month.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>}
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {pricingTiers.map((tier, index) => {
            const isCurrentPlan = subscriptionInfo.subscribed && subscriptionInfo.subscription_tier === tier.name;
            return <Card key={tier.name} className={`relative ${tier.popular || isCurrentPlan ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                  {tier.popular && !isCurrentPlan && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>}
                  {isCurrentPlan && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white">
                      Your Plan
                    </Badge>}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {tier.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                   <div className="flex items-baseline justify-center">
                     {tier.price === 0 ? <span className="text-4xl font-bold">Free
                  </span> : <>
                         <span className="text-4xl font-bold">${tier.price}</span>
                         <span className="text-muted-foreground ml-1">/month</span>
                       </>}
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
                    <Button className="w-full" variant={isCurrentPlan ? "secondary" : tier.popular ? "default" : "outline"} onClick={() => handleSubscribe(tier.name)} disabled={loading === tier.name || isCurrentPlan}>
                      {loading === tier.name ? "Processing..." : isCurrentPlan ? "Current Plan" : tier.buttonText}
                    </Button>
                  </CardFooter>
                </Card>;
          })}
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
                  Trial users get 5 scans/month, Pro users get 25 scans/month. After that, you'll need to upgrade for more scans.
                </p>
              </div>
              <div className="text-left">
                <h3 className="font-semibold mb-2">Which plans have unlimited scans?</h3>
                <p className="text-muted-foreground text-sm">
                  Only the Team plan includes unlimited scans with no monthly restrictions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>;
};
export default Pricing;