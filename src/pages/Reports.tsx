import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExternalLink, AlertTriangle, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScanReport {
  id: string;
  repository_url: string;
  repository_name: string;
  security_score: number;
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  scan_results: any;
  created_at: string;
}

const Reports = () => {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      fetchReports();
    } else if (!loading && !user) {
      setIsLoading(false);
    }
  }, [user, loading]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityBadge = (type: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      critical: "destructive",
      high: "destructive", 
      medium: "secondary",
      low: "outline"
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {count} {type}
      </Badge>
    );
  };

  if (loading || isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-foreground mb-6">Security Reports</h1>
            <Card>
              <CardContent className="p-8">
                <p className="text-lg text-muted-foreground text-center">
                  Please sign in to view your security reports.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Security Reports</h1>
              <p className="text-lg text-muted-foreground">
                View comprehensive security analysis reports for your repositories.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/scanner'} className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              New Scan
            </Button>
          </div>

          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by scanning your first repository to see security reports here.
                  </p>
                  <Button onClick={() => window.location.href = '/scanner'}>
                    Scan Repository
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scan History</CardTitle>
                  <CardDescription>
                    {reports.length} scan{reports.length !== 1 ? 's' : ''} completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repository</TableHead>
                        <TableHead>Security Score</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Scanned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">{report.repository_name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  <a 
                                    href={report.repository_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {report.repository_url}
                                  </a>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-semibold ${getScoreColor(report.security_score)}`}>
                                {report.security_score}
                              </span>
                              <span className="text-sm text-muted-foreground">/100</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getSeverityBadge('critical', report.critical_issues)}
                              {getSeverityBadge('high', report.high_issues)}
                              {getSeverityBadge('medium', report.medium_issues)}
                              {getSeverityBadge('low', report.low_issues)}
                              {report.total_issues === 0 && (
                                <Badge variant="outline" className="text-green-600">
                                  No issues
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(report.created_at), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to scanner with this repo URL
                                window.location.href = `/scanner?repo=${encodeURIComponent(report.repository_url)}`;
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Reports;