import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskAnalysisRequest {
  results: any[];
  repositoryContext: {
    name: string;
    description?: string;
    language?: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large';
  };
}

interface EnhancedRiskAssessment {
  overallRisk: number;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  exploitability: number;
  dataAtRisk: string[];
  complianceImpact: string[];
  recommendations: string[];
  prioritizedIssues: any[];
}

const industryRiskFactors = {
  fintech: { multiplier: 1.8, complianceReqs: ['PCI-DSS', 'SOX', 'GDPR'] },
  healthcare: { multiplier: 1.7, complianceReqs: ['HIPAA', 'HITECH', 'GDPR'] },
  ecommerce: { multiplier: 1.5, complianceReqs: ['PCI-DSS', 'GDPR', 'CCPA'] },
  saas: { multiplier: 1.4, complianceReqs: ['SOC2', 'GDPR', 'ISO27001'] },
  enterprise: { multiplier: 1.3, complianceReqs: ['SOC2', 'ISO27001'] },
  default: { multiplier: 1.0, complianceReqs: ['OWASP', 'CWE'] }
};

const severityScores = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 1
};

function calculateExploitability(issue: any): number {
  let score = severityScores[issue.severity] || 1;
  
  // Increase score for certain vulnerability types
  if (issue.type === 'secret') score *= 1.5;
  if (issue.type === 'vulnerability' && issue.description?.includes('injection')) score *= 1.4;
  if (issue.type === 'misconfiguration' && issue.description?.includes('debug')) score *= 1.2;
  
  // Consider accessibility factors
  if (issue.file?.includes('public') || issue.file?.includes('client')) score *= 1.3;
  if (issue.file?.includes('server') || issue.file?.includes('api')) score *= 1.1;
  
  return Math.min(score, 10);
}

function assessBusinessImpact(results: any[], industry: string): 'low' | 'medium' | 'high' | 'critical' {
  const riskFactor = industryRiskFactors[industry] || industryRiskFactors.default;
  const criticalIssues = results.filter(r => r.severity === 'critical').length;
  const highIssues = results.filter(r => r.severity === 'high').length;
  
  const weightedScore = (criticalIssues * 4 + highIssues * 2) * riskFactor.multiplier;
  
  if (weightedScore >= 12) return 'critical';
  if (weightedScore >= 8) return 'high';
  if (weightedScore >= 4) return 'medium';
  return 'low';
}

function identifyDataAtRisk(results: any[]): string[] {
  const dataTypes = new Set<string>();
  
  results.forEach(result => {
    if (result.description?.toLowerCase().includes('password')) {
      dataTypes.add('User credentials');
    }
    if (result.description?.toLowerCase().includes('api key') || result.type === 'secret') {
      dataTypes.add('API keys & tokens');
    }
    if (result.description?.toLowerCase().includes('database')) {
      dataTypes.add('Database access');
    }
    if (result.description?.toLowerCase().includes('user') || result.description?.toLowerCase().includes('personal')) {
      dataTypes.add('Personal data');
    }
    if (result.description?.toLowerCase().includes('financial') || result.description?.toLowerCase().includes('payment')) {
      dataTypes.add('Financial data');
    }
    if (result.description?.toLowerCase().includes('admin') || result.description?.toLowerCase().includes('privilege')) {
      dataTypes.add('Administrative access');
    }
  });
  
  return Array.from(dataTypes);
}

async function generateAIRecommendations(results: any[], context: any): Promise<string[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return [
      'Review all critical and high severity issues immediately',
      'Implement proper secret management practices',
      'Enable security monitoring and alerting',
      'Conduct regular security assessments'
    ];
  }

  try {
    const prompt = `As a senior cybersecurity consultant, analyze these security findings and provide strategic recommendations for a ${context.industry || 'software'} organization:

REPOSITORY: ${context.name}
INDUSTRY: ${context.industry || 'general software'}
SIZE: ${context.size || 'unknown'}

SECURITY FINDINGS:
${results.slice(0, 10).map(r => `- ${r.severity.toUpperCase()}: ${r.title} in ${r.file}`).join('\n')}

Provide 5-7 prioritized, actionable recommendations that address:
1. Immediate security actions needed
2. Process improvements to prevent similar issues
3. Tools and automation to implement
4. Compliance considerations for this industry
5. Long-term security strategy

Return only a JSON array of strings, each being a specific, actionable recommendation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a cybersecurity expert providing strategic security recommendations. Respond only with a JSON array of actionable recommendations.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
  }

  // Fallback recommendations
  return [
    'Address all critical and high severity security issues immediately',
    'Implement automated secret scanning in your CI/CD pipeline',
    'Set up security monitoring and alerting for your applications',
    'Conduct regular security code reviews and penetration testing',
    'Establish a security incident response plan and procedures'
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { results, repositoryContext }: RiskAnalysisRequest = await req.json();

    console.log('Risk analysis request for:', repositoryContext.name);

    // Calculate enhanced risk metrics
    const overallRisk = results.reduce((acc, result) => {
      const exploitability = calculateExploitability(result);
      return acc + (severityScores[result.severity] * exploitability / 10);
    }, 0) / Math.max(results.length, 1);

    const businessImpact = assessBusinessImpact(results, repositoryContext.industry || 'default');
    const dataAtRisk = identifyDataAtRisk(results);
    
    // Generate compliance impact assessment
    const riskFactor = industryRiskFactors[repositoryContext.industry || 'default'];
    const complianceImpact = riskFactor.complianceReqs.filter(standard => {
      return results.some(r => 
        r.severity === 'critical' || 
        r.severity === 'high' ||
        (r.type === 'secret' && standard.includes('PCI')) ||
        (r.description?.includes('data') && standard.includes('GDPR'))
      );
    });

    // Prioritize issues based on exploitability and business impact
    const prioritizedIssues = results
      .map(issue => ({
        ...issue,
        exploitability: calculateExploitability(issue),
        riskScore: severityScores[issue.severity] * calculateExploitability(issue) * (businessImpact === 'critical' ? 1.5 : 1)
      }))
      .sort((a, b) => b.riskScore - a.riskScore);

    // Generate AI-powered recommendations
    const recommendations = await generateAIRecommendations(results, repositoryContext);

    const assessment: EnhancedRiskAssessment = {
      overallRisk: Math.round(overallRisk * 10) / 10,
      businessImpact,
      exploitability: Math.round(prioritizedIssues.slice(0, 5).reduce((acc, issue) => acc + issue.exploitability, 0) / 5 * 10) / 10,
      dataAtRisk,
      complianceImpact,
      recommendations,
      prioritizedIssues: prioritizedIssues.slice(0, 10) // Top 10 prioritized issues
    };

    return new Response(
      JSON.stringify({
        success: true,
        assessment
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Risk analysis error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to analyze security risks'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});