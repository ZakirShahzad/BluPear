import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SCAN-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform database operations
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's subscription info to determine scan limit
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      throw subscriptionError;
    }

    // Determine scan limit based on subscription tier
    let scanLimit = 5; // Default for Trial Tier
    const subscriptionTier = subscriptionData?.subscription_tier || "Trial Tier";
    
    if (subscriptionTier === "Pro") {
      scanLimit = 25;
    } else if (subscriptionTier === "Team") {
      scanLimit = -1; // Unlimited
    }

    // Get current month's scan usage
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const { data: scanUsage, error: usageError } = await supabaseClient
      .from('scan_usage')
      .select('scan_count')
      .eq('user_id', user.id)
      .eq('month_year', currentMonth)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw usageError;
    }

    const currentScans = scanUsage?.scan_count || 0;
    const canScan = scanLimit === -1 ? true : currentScans < scanLimit; // Unlimited or under limit
    logStep("Retrieved scan usage", { currentMonth, currentScans, scanLimit, subscriptionTier, canScan });

    return new Response(JSON.stringify({
      current_scans: currentScans,
      scan_limit: scanLimit,
      can_scan: canScan,
      month_year: currentMonth,
      subscription_tier: subscriptionTier
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-scan-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});