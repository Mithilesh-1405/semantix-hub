import { useState } from 'react';
import PDFUpload from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search } from 'lucide-react';

export default function PDFSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please upload a PDF file first');
      return;
    }
    toast.success('PDF uploaded successfully!');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">PDF Search</h1>
        </div>
        <p className="text-muted-foreground">
          Upload a PDF document to enable intelligent search capabilities
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Upload PDF Document</Label>
          <PDFUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
        </div>

        <Button
          onClick={handleUpload}
          className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 text-base"
        >
          <Upload className="mr-2 h-5 w-5" />
          Upload
        </Button>
      </div>
    </div>
  );
}
