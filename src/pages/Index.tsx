import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { SecurityScanner } from "@/components/SecurityScanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <FeatureGrid />
      <section id="scanner-section" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-foreground">
              Try BluPear Scanner
            </h2>
            <p className="text-xl text-muted-foreground">
              Enter any public GitHub repository URL to perform a comprehensive security analysis
            </p>
          </div>
          <SecurityScanner />
        </div>
      </section>
    </div>
  );
};

export default Index;
