import { useState, useEffect } from "react";
import { Check, Crown, Zap, Shield, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import PaystackPop from "@paystack/inline-js";
import { useNavigate } from "react-router-dom";

// --- 1. SETUP SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

// Initialize once to prevent "Multiple Instances" warning
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function Upgrade() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
    
  // Stores the ACTIVE plan key
  const [activePlanKey, setActivePlanKey] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      console.error("⚠️ Supabase Keys missing!");
      return;
    }

    const loadData = async () => {
      try {
        // A. Get User
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData?.user;
        
        if (currentUser) {
          setUser(currentUser);

          // B. Get Active Subscription
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subData) {
            setActivePlanKey(subData.plan);
          }
        }

        // C. Get All Plans
        const { data: plansData, error } = await supabase
          .from("plans")
          .select("*")
          .neq('plan_key', 'free')
          .order("price_ngn", { ascending: true });

        if (error) throw error;

        // Custom sort order
        const order = ['student_monthly', 'monthly', 'yearly', 'enterprise'];
        const sortedData = plansData?.sort((a: any, b: any) => order.indexOf(a.plan_key) - order.indexOf(b.plan_key));
        setPlans(sortedData || []);

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load plan info");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubscribe = async (plan: any) => {
    // Enterprise Logic
    if (plan.plan_key === 'enterprise') {
      navigate('/contact-sales');
      return;
    }

    if (!user) {
      toast.error("Please log in first");
      return;
    }

    if (!plan.paystack_plan_id) {
      toast.error("Configuration Error: Missing Paystack Plan ID");
      return;
    }

    if (!paystackPublicKey) {
      toast.error("Configuration Error: Missing Paystack Public Key");
      return;
    }

    setProcessingPlanId(plan.id);

    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: paystackPublicKey, // 👈 USES LIVE KEY FROM ENV
      email: user.email,
      amount: plan.price_ngn * 100,
      plan: plan.paystack_plan_id,
      
      metadata: {
        user_id: user.id,
        plan_key: plan.plan_key,
        custom_fields: [
          { display_name: "User ID", variable_name: "user_id", value: user.id },
          { display_name: "Plan Key", variable_name: "plan_key", value: plan.plan_key }
        ]
      },
      
      // 👇 THIS VERSION ONLY RELOADS THE PAGE
      // It assumes your Webhook has already updated the database in the background.
      onSuccess: async (transaction: any) => {
        toast.success(`Payment Successful! Reference: ${transaction.reference}`);
        setProcessingPlanId(null);
        // Reload to refresh subscription status
        setTimeout(() => {
            window.location.reload();
        }, 2500);
      },
      
      onCancel: () => {
        setProcessingPlanId(null);
        toast.info("Transaction cancelled");
      },
    });
  };

  const getPlanIcon = (key: string) => {
    switch (key) {
      case 'student_monthly': return <Shield className="w-6 h-6 text-primary-foreground" />;
      case 'monthly': return <Crown className="w-6 h-6 text-primary-foreground" />;
      case 'yearly': return <Star className="w-6 h-6 text-primary-foreground" />;
      case 'enterprise': return <Zap className="w-6 h-6 text-primary-foreground" />;
      default: return <Shield className="w-6 h-6 text-primary-foreground" />;
    }
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Upgrade Your Plan</h1>
          <p className="text-xl text-muted-foreground">Choose the perfect plan for your legal practice</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-10 h-10 text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = activePlanKey === plan.plan_key;

              return (
                <Card 
                  key={plan.id} 
                  className={`relative hover:shadow-lg transition-shadow flex flex-col ${
                    isCurrentPlan 
                      ? 'border-green-500 ring-1 ring-green-500 shadow-md bg-green-50/10' 
                      : (plan.plan_key === 'yearly' ? 'border-primary ring-1 ring-primary shadow-md' : '')
                  }`}
                >
                  {isCurrentPlan ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        <Check className="w-3 h-3" /> Current Plan
                      </span>
                    </div>
                  ) : plan.plan_key === 'yearly' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        Best Value
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto mb-4 w-12 h-12 rounded-lg flex items-center justify-center ${isCurrentPlan ? 'bg-green-600' : 'bg-primary'}`}>
                      {getPlanIcon(plan.plan_key)}
                    </div>
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    
                    <div className="mt-4 min-h-[80px] flex flex-col justify-center">
                      {plan.price_ngn === 0 ? (
                        <span className="text-3xl font-bold text-primary">Contact Us</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-primary">₦{plan.price_ngn.toLocaleString()}</span>
                          <span className="text-muted-foreground">/{plan.duration_days === 365 ? 'year' : 'month'}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 mb-8 flex-1">
                      {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || []).map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isCurrentPlan ? 'text-green-600' : 'text-primary'}`} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`w-full ${
                        isCurrentPlan 
                          ? 'bg-green-600 hover:bg-green-700 opacity-100 cursor-default' 
                          : plan.plan_key === 'enterprise' 
                            ? 'bg-slate-800 hover:bg-slate-700' 
                            : ''
                      }`} 
                      variant={
                        isCurrentPlan 
                          ? 'default' 
                          : (plan.plan_key === 'enterprise' ? 'default' : (plan.plan_key === 'yearly' ? 'default' : 'outline'))
                      }
                      disabled={isCurrentPlan || (processingPlanId !== null && processingPlanId !== plan.id)}
                      onClick={() => !isCurrentPlan && handleSubscribe(plan)}
                    >
                      {processingPlanId === plan.id ? (
                        <Loader2 className="animate-spin" />
                      ) : isCurrentPlan ? (
                        "Active Plan"
                      ) : plan.plan_key === 'enterprise' ? (
                        "Contact Sales"
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
