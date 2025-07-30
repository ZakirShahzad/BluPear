import { Header } from "@/components/Header";
import { SecurityScanner } from "@/components/SecurityScanner";

const Scanner = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold text-foreground">
              BluPear Security Scanner
            </h1>
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

export default Scanner;