/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import PDFUpload from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, SlidersHorizontal, RotateCcw, Loader2 } from 'lucide-react';
import { useBackendHelper } from '@/config/backend_helper';
import { AxiosError } from 'axios';

export default function ResumeAnalyser() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [polishResult, setPolishResult] = useState<{ similarityScore: number; message: string } | null>(null);
  const { analyseResume } = useBackendHelper();

  const handlePolish = async () => {
    if (!selectedFile) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }
    
    setIsAnalyzing(true);
    setPolishResult(null);
    try {
      const response = await analyseResume(selectedFile, jobDescription);
      
      if (response.status === 200 && response.data.success) {
        toast.success('Analysis complete');
        setPolishResult(response.data.data);
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      const axiosError = error as AxiosError<any>;
      if (axiosError.response) {
        toast.error(`Error ${axiosError.response.status}: ${axiosError.response.data.message || 'Server Error'}`);
      } else if (axiosError.request) {
        toast.error('No response from server');
      } else {
        toast.error('Failed to initiate resume analysis');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setJobDescription('');
    setPolishResult(null);
  };

  // Helper to determine status and tips based on similarity score
  const getMatchDetails = (score: number) => {
    const pct = Math.min(100, Math.max(0, score * 100));
    if (pct >= 85) {
      return {
        label: 'Excellent Match',
        color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
        desc: 'Your resume is highly optimized for this job description. It contains strong semantic alignment with the key skills and requirements.',
        tips: [
          'Verify that all contact information and links are up to date.',
          'Tailor your cover letter to reinforce these matching strong points.',
          'Review formatting to ensure no parse issues during ATS processing.'
        ]
      };
    } else if (pct >= 70) {
      return {
        label: 'Strong Match',
        color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
        desc: 'Your resume shows good alignment with the core role requirements, but there is room to make a stronger impression.',
        tips: [
          'Incorporate more specific action verbs from the job description.',
          'Quantify achievements (e.g., percentages, budgets, team sizes) in your experience details.',
          'Double check that critical technologies mentioned in the job description are explicitly named.'
        ]
      };
    } else if (pct >= 50) {
      return {
        label: 'Moderate Match',
        color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
        desc: 'Your resume covers some of the required experience, but lacks alignment with key technical focus areas or requirements.',
        tips: [
          'Directly align your professional summary with the core theme of the job description.',
          'Reorder your skills list to prioritize the technologies or practices highlighted in the description.',
          'Expand on relevant projects that match the responsibilities listed.'
        ]
      };
    } else {
      return {
        label: 'Needs Optimization',
        color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
        desc: 'The semantic overlap between your resume and the job description is low. Key requirements might be missing or described using different terminology.',
        tips: [
          'Carefully review the job description and list the top 5 mandatory skills.',
          'Rewrite your experience bullet points to map directly to the daily responsibilities of the role.',
          'Use standard industry terms instead of internal company-specific terminology.'
        ]
      };
    }
  };

  const match = polishResult ? getMatchDetails(polishResult.similarityScore) : null;
  const pct = polishResult ? Math.round(polishResult.similarityScore * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Resume Analyser
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            Find out how your resume scores for various job descriptions.
          </p>
        </div>

        {polishResult && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-1.5 h-8 text-xs active-scale"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear & Start Over
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-border rounded-xl bg-card p-4 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">1. Upload Resume (PDF)</Label>
              <PDFUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobDescription" className="text-xs font-semibold text-foreground">
                2. Target Job Description
              </Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the details of the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[160px] resize-none focus-visible:ring-primary text-xs p-3 bg-background/50 border-border rounded-lg"
              />
            </div>

            <Button
              onClick={handlePolish}
              disabled={isAnalyzing}
              className="w-full gradient-primary text-primary-foreground font-bold h-10 text-xs shadow-md transition-all active-scale rounded-lg"
            >
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <>
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Results Dashboard */}
        <div className="lg:col-span-5">
          {polishResult ? (
            <div className="space-y-4 animate-fade-in-up">
              {/* Score Display Card */}
              <div className="border border-border rounded-xl bg-card p-4 shadow-sm">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Analysis Result</h3>
                
                <div className="flex flex-col items-center justify-center py-3">
                  {/* Progress Ring */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-muted"
                        strokeWidth="7"
                        fill="none"
                      />
                      {/* Progress */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-primary transition-all duration-1000 ease-out"
                        strokeWidth="7"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * pct) / 100}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-2xl font-extrabold text-foreground font-sans">{pct}%</span>
                      <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Match</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`mt-4 px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${match?.color}`}>
                    {match?.label}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 mt-1.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {match?.desc}
                  </p>
                </div>
              </div>

              {/* Tips Checklist Card */}
              <div className="border border-border rounded-xl bg-card p-4 shadow-sm">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Recommended Actions</h3>
                <ul className="space-y-2.5">
                  {match?.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[9px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border/80 rounded-xl bg-card/40 p-6 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
              <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <SlidersHorizontal className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-xs text-foreground mb-1">Awaiting Analysis</h3>
              <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                Provide your resume document and the target job description to compute semantic alignment recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
