import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";

const Pricing = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-foreground mb-6">Pricing Plans</h1>
          <p className="text-lg text-muted-foreground">
            Choose the perfect plan for your security scanning needs.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;