import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PageTransition } from "@/components/PageTransition";
import PrivacySection from "@/components/PrivacySection";

const Index = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <HeroSection />
        <FeatureGrid />
        <PrivacySection />
      </div>
    </PageTransition>
  );
};

export default Index;
