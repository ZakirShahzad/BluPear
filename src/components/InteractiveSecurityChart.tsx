import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SecurityScore {
  overall: number;
  secrets: number;
  vulnerabilities: number;
  configurations: number;
  patterns: number;
}

interface InteractiveSecurityChartProps {
  score: SecurityScore;
}

const COLORS = {
  excellent: '#10B981', // green
  good: '#3B82F6',      // blue
  warning: '#F59E0B',   // yellow
  critical: '#EF4444',  // red
};

const getScoreColor = (score: number) => {
  if (score >= 90) return COLORS.excellent;
  if (score >= 70) return COLORS.good;
  if (score >= 50) return COLORS.warning;
  return COLORS.critical;
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'Critical';
};

export const InteractiveSecurityChart = ({ score }: InteractiveSecurityChartProps) => {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const chartData = [
    { name: 'Secrets', value: score.secrets, fullName: 'Secret Detection' },
    { name: 'Vulnerabilities', value: score.vulnerabilities, fullName: 'Vulnerability Assessment' },
    { name: 'Configurations', value: score.configurations, fullName: 'Security Configurations' },
    { name: 'Patterns', value: score.patterns, fullName: 'Code Patterns' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="border-primary/20 bg-card/95 backdrop-blur">
          <CardContent className="p-3">
            <p className="font-semibold text-foreground">{data.fullName}</p>
            <p className="text-2xl font-bold" style={{ color: getScoreColor(data.value) }}>
              {data.value}%
            </p>
            <Badge variant="outline" className="mt-1">
              {getScoreLabel(data.value)}
            </Badge>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">Security Breakdown</CardTitle>
        
        <div className="text-center py-4">
          <div className="text-4xl font-bold mb-2" style={{ color: getScoreColor(score.overall) }}>
            {score.overall}%
          </div>
          <Badge variant="outline" className="text-lg px-4 py-1">
            {getScoreLabel(score.overall)} Security Score
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                className="transition-all duration-300"
                onMouseEnter={(_, index) => setActiveSegment(chartData[index].name)}
                onMouseLeave={() => setActiveSegment(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getScoreColor(entry.value)}
                    style={{
                      filter: activeSegment === entry.name ? 'brightness(1.2)' : 'brightness(1)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          {chartData.map((item) => (
            <div 
              key={item.name}
              className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer ${
                activeSegment === item.name 
                  ? 'border-primary bg-primary/5 scale-105' 
                  : 'border-border hover:border-primary/50'
              }`}
              onMouseEnter={() => setActiveSegment(item.name)}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{item.fullName}</span>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getScoreColor(item.value) }}
                />
              </div>
              <div className="text-2xl font-bold" style={{ color: getScoreColor(item.value) }}>
                {item.value}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};