import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const [selectedView, setSelectedView] = useState<'pie' | 'bar'>('pie');

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

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke={fill}
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-foreground">Security Breakdown</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView('pie')}
              className={`px-3 py-1 rounded text-sm transition-all ${
                selectedView === 'pie' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Pie
            </button>
            <button
              onClick={() => setSelectedView('bar')}
              className={`px-3 py-1 rounded text-sm transition-all ${
                selectedView === 'bar' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Bar
            </button>
          </div>
        </div>
        
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
            {selectedView === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveSegment(chartData[index].name)}
                  onMouseLeave={() => setActiveSegment(null)}
                  className="transition-all duration-300"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getScoreColor(entry.value)}
                      stroke={activeSegment === entry.name ? "#ffffff" : "transparent"}
                      strokeWidth={activeSegment === entry.name ? 2 : 0}
                      style={{
                        filter: activeSegment === entry.name ? 'brightness(1.1)' : 'brightness(1)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
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
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getScoreColor(entry.value)}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
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

// Add Sector component for pie chart active shape
const Sector = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, stroke, strokeWidth } = props;
  
  return (
    <path
      d={`M ${cx + innerRadius * Math.cos(-startAngle * Math.PI / 180)} ${cy + innerRadius * Math.sin(-startAngle * Math.PI / 180)}
          A ${innerRadius} ${innerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${cx + innerRadius * Math.cos(-endAngle * Math.PI / 180)} ${cy + innerRadius * Math.sin(-endAngle * Math.PI / 180)}
          L ${cx + outerRadius * Math.cos(-endAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-endAngle * Math.PI / 180)}
          A ${outerRadius} ${outerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 0 ${cx + outerRadius * Math.cos(-startAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-startAngle * Math.PI / 180)}
          Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};