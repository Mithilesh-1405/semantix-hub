import { useState } from 'react';
import PDFUpload from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, FileText } from 'lucide-react';

export default function ResumePolisher() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');

  const handlePolish = () => {
    if (!selectedFile) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }
    toast.success('Resume polish initiated!');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Resume Polisher</h1>
        </div>
        <p className="text-muted-foreground">
          Upload your resume and provide a job description to get tailored improvements
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Upload Resume (PDF)</Label>
          <PDFUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
        </div>

        <div className="space-y-3">
          <Label htmlFor="jobDescription" className="text-base font-medium">
            Job Description
          </Label>
          <Textarea
            id="jobDescription"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[180px] resize-none"
          />
        </div>

        <Button
          onClick={handlePolish}
          className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 text-base"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Polish Resume
        </Button>
      </div>
    </div>
  );
}
