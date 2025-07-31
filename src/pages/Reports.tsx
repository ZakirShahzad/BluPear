import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";

const Reports = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-foreground mb-6">Security Reports</h1>
          <p className="text-lg text-muted-foreground">
            View comprehensive security analysis reports for your repositories.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Reports;