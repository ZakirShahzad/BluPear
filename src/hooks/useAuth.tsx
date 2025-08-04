import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

interface ScanUsageInfo {
  current_scans: number;
  scan_limit: number;
  can_scan: boolean;
  month_year: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionInfo: SubscriptionInfo;
  scanUsageInfo: ScanUsageInfo;
  refreshSubscription: () => Promise<void>;
  refreshScanUsage: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({ subscribed: false });
  const [scanUsageInfo, setScanUsageInfo] = useState<ScanUsageInfo>({ 
    current_scans: 0, 
    scan_limit: 5, 
    can_scan: true, 
    month_year: new Date().toISOString().substring(0, 7) 
  });

  const checkSubscription = async (userSession?: Session) => {
    const currentSession = userSession || session;
    if (!currentSession) {
      setSubscriptionInfo({ subscribed: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionInfo({ subscribed: false });
        return;
      }

      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionInfo({ subscribed: false });
    }
  };

  const checkScanUsage = async (userSession?: Session) => {
    const currentSession = userSession || session;
    if (!currentSession) {
      setScanUsageInfo({ 
        current_scans: 0, 
        scan_limit: 5, 
        can_scan: true, 
        month_year: new Date().toISOString().substring(0, 7) 
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-scan-usage', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking scan usage:', error);
        return;
      }

      setScanUsageInfo(data);
    } catch (error) {
      console.error('Error checking scan usage:', error);
    }
  };

  const refreshSubscription = async () => {
    await checkSubscription();
  };

  const refreshScanUsage = async () => {
    await checkScanUsage();
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription and scan usage after auth state changes
        if (session) {
          setTimeout(() => {
            checkSubscription(session);
            checkScanUsage(session);
          }, 0);
        } else {
          setSubscriptionInfo({ subscribed: false });
          setScanUsageInfo({ 
            current_scans: 0, 
            scan_limit: 5, 
            can_scan: true, 
            month_year: new Date().toISOString().substring(0, 7) 
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        setTimeout(() => checkSubscription(session), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    subscriptionInfo,
    scanUsageInfo,
    refreshSubscription,
    refreshScanUsage,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};