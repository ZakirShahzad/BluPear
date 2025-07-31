import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface ScanStep {
  id: string;
  label: string;
  description: string;
  duration: number;
}

interface EnhancedScanProgressProps {
  isScanning: boolean;
  progress: number;
  onComplete: () => void;
}

const scanSteps: ScanStep[] = [
  { id: "clone", label: "Cloning Repository", description: "Fetching repository contents...", duration: 15 },
  { id: "analyze", label: "Code Analysis", description: "Scanning for security patterns...", duration: 25 },
  { id: "secrets", label: "Secret Detection", description: "Searching for exposed credentials...", duration: 20 },
  { id: "vulnerabilities", label: "Vulnerability Check", description: "Checking dependencies for known issues...", duration: 25 },
  { id: "report", label: "Generating Report", description: "Compiling security assessment...", duration: 15 }
];

export const EnhancedScanProgress = ({ isScanning, progress, onComplete }: EnhancedScanProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; opacity: number; size: number }>>([]);

  useEffect(() => {
    if (!isScanning) {
      setCurrentStep(0);
      setStepProgress(0);
      setScanLine(0);
      setParticles([]);
      return;
    }

    // Calculate current step based on progress
    const totalSteps = scanSteps.length;
    const stepIndex = Math.min(Math.floor((progress / 100) * totalSteps), totalSteps - 1);
    setCurrentStep(stepIndex);

    // Calculate progress within current step
    const stepStart = (stepIndex / totalSteps) * 100;
    const stepEnd = ((stepIndex + 1) / totalSteps) * 100;
    const withinStepProgress = ((progress - stepStart) / (stepEnd - stepStart)) * 100;
    setStepProgress(Math.max(0, Math.min(100, withinStepProgress)));

    // Animate scan line
    setScanLine(progress);

    // Generate particles
    if (Math.random() > 0.7) {
      setParticles(prev => [
        ...prev.slice(-15), // Keep only last 15 particles
        {
          id: Date.now(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          opacity: 1,
          size: Math.random() * 4 + 2
        }
      ]);
    }

    // Update particle positions and opacity
    setParticles(prev => prev.map(particle => ({
      ...particle,
      y: particle.y + 2,
      opacity: particle.opacity * 0.95
    })).filter(particle => particle.opacity > 0.1 && particle.y < 105));

    if (progress >= 100) {
      setTimeout(onComplete, 500);
    }
  }, [isScanning, progress, onComplete]);

  if (!isScanning) return null;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      {/* Scan line animation */}
      <div 
        className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-70 transition-all duration-1000 ease-out"
        style={{ left: `${scanLine}%` }}
      />
      
      {/* Floating particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary/60 animate-pulse pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            transition: 'all 0.3s ease-out'
          }}
        />
      ))}
      
      <CardContent className="p-6 relative z-10">
        <div className="space-y-6">
          {/* Main progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Security Scan in Progress</h3>
              <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-3 bg-secondary/50"
            />
          </div>
          
          {/* Current step indicator */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <div>
                <p className="font-semibold text-foreground">{scanSteps[currentStep]?.label}</p>
                <p className="text-sm text-muted-foreground">{scanSteps[currentStep]?.description}</p>
              </div>
            </div>
            
            {/* Step progress */}
            <Progress 
              value={stepProgress} 
              className="h-2 bg-muted/30"
            />
          </div>
          
          {/* Steps overview */}
          <div className="grid grid-cols-5 gap-2">
            {scanSteps.map((step, index) => (
              <div
                key={step.id}
                className={`text-center p-2 rounded-lg transition-all duration-300 ${
                  index < currentStep 
                    ? 'bg-primary/20 text-primary' 
                    : index === currentStep 
                    ? 'bg-primary/10 text-primary animate-pulse' 
                    : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                  index < currentStep 
                    ? 'bg-primary' 
                    : index === currentStep 
                    ? 'bg-primary animate-pulse' 
                    : 'bg-muted-foreground/50'
                }`} />
                <p className="text-xs font-medium truncate">{step.label}</p>
              </div>
            ))}
          </div>
          
          {/* Scanning effects text */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Analyzing security patterns</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              This may take a few moments depending on repository size
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};