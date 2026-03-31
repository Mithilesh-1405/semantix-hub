import { useState } from 'react';
import PDFUpload from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search } from 'lucide-react';
import { useBackendHelper } from '@/config/backend_helper';
import { AxiosError } from 'axios';
import { Textarea } from '@/components/ui/textarea';

export default function PDFSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { searchPDF } = useBackendHelper()

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (!searchQuery.trim()) {
      toast.error('Please enter a valid search query!');
      return;
    }
    try {
      console.log("pdf file", selectedFile)
      const response = await searchPDF(selectedFile, searchQuery);

      if (response.status === 200 && response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response) {
        toast.error(`Error ${axiosError.response.status}: ${axiosError.response.data.message || 'Server Error'}`);
      } else if (axiosError.request) {
        toast.error('No response from server');
      } else {
        toast.error('Failed to initiate Search PDF');
      }
    }
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

        <div className="space-y-3">
          <Label htmlFor="searchQuery" className="text-base font-medium">
            Search Query
          </Label>
          <Textarea
            id="searchQuery"
            placeholder="Paste the search query here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[180px] resize-none"
          />
        </div>

        <Button
          onClick={handleUpload}
          className="w-full gradient-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity h-12 text-base"
        >
          <Upload className="mr-2 h-5 w-5" />
          Search
        </Button>
      </div>
    </div>
  );
}
