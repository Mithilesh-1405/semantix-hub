import { useState, useEffect, useCallback, useMemo } from 'react';
import PDFUpload from '@/components/PDFUpload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Upload, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  Percent,
  FileText,
  AlertCircle,
  Layout
} from 'lucide-react';
import { useBackendHelper } from '@/config/backend_helper';
import { AxiosError } from 'axios';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SearchResult {
  id: number;
  page: number;
  similarity: number;
  similarityPercent: number;
  text: string;
  highlightedText: string;
  metadata: {
    source: string;
    pdfId: number;
  };
}

interface SearchResponse {
  success: boolean;
  data: {
    success: boolean;
    query: string;
    pdfId: number;
    totalMatches: number;
    summary: string;
    results: SearchResult[];
  };
  message: string;
}

export default function PDFSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [hasSearched, setHasSearched] = useState(false);

  const { searchPDF } = useBackendHelper();

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
      setSearchResults([]);
      setActiveResultIndex(null);
      setHasSearched(false);
    }
  }, [selectedFile]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleSearch = async () => {
    if (!selectedFile) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (!searchQuery.trim()) {
      toast.error('Please enter a valid search query!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchPDF(selectedFile, searchQuery);
      const resData = response.data as SearchResponse;

      if (response.status === 200 && resData.success) {
        toast.success(resData.message);
        setSearchResults(resData.data.results);
        setHasSearched(true);
        if (resData.data.results.length > 0) {
          setActiveResultIndex(0);
          setPageNumber(resData.data.results[0].page);
        }
      } else {
        toast.error(resData.message || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response) {
        toast.error(`Error ${axiosError.response.status}: ${axiosError.response.data.message || 'Server Error'}`);
      } else {
        toast.error('Failed to initiate Search PDF');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToResult = (index: number) => {
    setActiveResultIndex(index);
    setPageNumber(searchResults[index].page);
  };

  // Custom text renderer for react-pdf to highlight matching text
  const highlightText = useCallback((textItem: { str: string, itemIndex: number }) => {
    // 1. Sanitize the string to prevent breaking the DOM with raw HTML characters
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const safeStr = escapeHtml(textItem.str);

    if (activeResultIndex === null || !searchResults[activeResultIndex]) {
      return safeStr;
    }

    const currentResult = searchResults[activeResultIndex];
    
    // Only highlight text on the page associated with the active search result
    if (pageNumber !== currentResult.page) {
      return safeStr;
    }

    // Prepare normalized strings stripped of all whitespace for robust matching
    // This allows us to match PDF text fragments even if spacing differs from the backend's extracted text.
    const itemNoSpaces = textItem.str.replace(/\s+/g, '').toLowerCase();
    const resultNoSpaces = currentResult.text.replace(/\s+/g, '').toLowerCase();
    const highlightedNoSpaces = currentResult.highlightedText 
        ? currentResult.highlightedText.replace(/\s+/g, '').toLowerCase() 
        : '';
    
    // Method A: Identify if this PDF text fragment belongs to the active search result paragraph.
    // Length > 6 ensures we don't accidentally highlight common short fragments like "the" or "and " 
    // that might randomly appear within the result string elsewhere.
    if (itemNoSpaces.length > 6 && (resultNoSpaces.includes(itemNoSpaces) || (highlightedNoSpaces && highlightedNoSpaces.includes(itemNoSpaces)))) {
       return `<mark class="bg-primary/30 text-foreground px-[2px] rounded-sm shadow-sm border-b-2 border-primary">${safeStr}</mark>`;
    }

    // Method B: Fallback - Highlight significant terms from the user search query on the active result page.
    if (searchQuery.trim()) {
        const queryTerms = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4);
        let htmlStr = safeStr;
        let matchFound = false;
        
        for (const term of queryTerms) {
           const regex = new RegExp(`(${term})`, 'gi');
           if (regex.test(htmlStr)) {
              htmlStr = htmlStr.replace(regex, `<mark class="bg-primary/20 text-foreground px-[2px] rounded-sm shadow-sm border-b-2 border-primary/50">$1</mark>`);
              matchFound = true;
           }
        }
        
        if (matchFound) return htmlStr;
    }
    
    return safeStr;
  }, [activeResultIndex, searchResults, searchQuery, pageNumber]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Semantic Document Explorer
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Upload and search your PDF using AI-powered contextual understanding.
          </p>
        </div>

        {hasSearched && (
          <Button 
            variant="outline" 
            onClick={() => {
              setHasSearched(false);
              setSearchResults([]);
              setActiveResultIndex(null);
            }}
            className="flex items-center gap-2"
          >
            <Layout className="h-4 w-4" />
            New Search
          </Button>
        )}
      </div>

      {!hasSearched ? (
        /* Initial Upload & Search UI */
        <div className="max-w-3xl mx-auto space-y-8 py-10">
          <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  1. Choose your document
                </Label>
                <div className="p-1 rounded-2xl bg-muted/30">
                  <PDFUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="searchQuery" className="text-lg font-semibold flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  2. What are you looking for?
                </Label>
                <Textarea
                  id="searchQuery"
                  placeholder="e.g., Describe what meaning you want to find..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[160px] text-lg p-4 rounded-xl resize-none focus-visible:ring-primary bg-background/50 border-muted"
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full gradient-primary text-primary-foreground font-bold h-14 text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Content...
                  </div>
                ) : (
                  <>
                    <Search className="mr-2 h-6 w-6" />
                    Deep Search PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { title: "Semantic Analysis", desc: "Understands context, not just keywords" },
              { title: "Instant Highlights", desc: "Finds relevant segments immediately" },
              { title: "Smart Navigation", desc: "Click results to jump to the right page" }
            ].map((feature, i) => (
              <div key={i} className="space-y-2 p-4 rounded-xl hover:bg-muted/30 transition-colors">
                <h3 className="font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Results & Preview Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-8 duration-500">
          {/* Sidebar: Results List */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-[850px]">
            <Card className="border-none shadow-xl bg-card/80 backdrop-blur-md flex-none">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Matches
                    <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none font-mono">
                      {searchResults.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <ScrollArea className="flex-1 rounded-2xl border bg-background/50 backdrop-blur shadow-inner">
              <div className="p-4 space-y-4">
                {searchResults.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                    <p className="text-muted-foreground font-medium">No direct matches found.</p>
                    <p className="text-xs text-muted-foreground px-10">Try rephrasing your search query.</p>
                  </div>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => goToResult(idx)}
                      className={`p-5 rounded-2xl cursor-pointer transition-all border-2 group relative overflow-hidden ${
                        activeResultIndex === idx
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10'
                          : 'bg-background border-transparent hover:border-muted-foreground/20 hover:shadow-md'
                      }`}
                    >
                      {activeResultIndex === idx && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                      )}
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-tighter px-2 py-0.5">
                          Page {result.page}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded-full">
                          <Percent className="h-3 w-3" />
                          {result.similarityPercent}%
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground/90 leading-relaxed line-clamp-4 group-hover:text-foreground">
                        {result.text}
                      </p>
                      <div className="mt-4 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1">
                           View on page <ChevronRight className="h-3 w-3" />
                         </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            {/* Search Query Reminder */}
            <Card className="bg-muted/40 border-none">
              <CardContent className="p-4 flex items-center gap-3">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Searching for: <span className="text-foreground font-medium italic">"{searchQuery}"</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main: PDF Viewer */}
          <div className="lg:col-span-8 h-[850px] flex flex-col gap-4">
            <Card className="border-none shadow-2xl bg-background overflow-hidden flex flex-col h-full ring-1 ring-black/5">
              <div className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between flex-none">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-background rounded-xl border-2 p-1 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="h-8 w-8 hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-4 border-x text-sm font-bold min-w-[100px] justify-center">
                      <span>{pageNumber}</span>
                      <span className="text-muted-foreground font-normal">/</span>
                      <span>{numPages || '--'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPageNumber(Math.min(numPages || pageNumber, pageNumber + 1))}
                      disabled={pageNumber >= (numPages || 1)}
                      className="h-8 w-8 hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="hidden sm:flex items-center bg-background rounded-xl border-2 p-1 shadow-sm">
                     <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.2))} className="h-8 w-8 font-bold">-</Button>
                     <span className="text-xs font-bold px-3 border-x min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                     <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(2.5, scale + 0.2))} className="h-8 w-8 font-bold">+</Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl || '', '_blank')} className="hidden sm:flex items-center gap-2 bg-background">
                    <ExternalLink className="h-4 w-4" />
                    Fullscreen
                  </Button>
                  {pdfUrl && (
                    <Button size="sm" asChild className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                      <a href={pdfUrl} download={selectedFile?.name || 'document.pdf'} className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Save
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="flex-1 bg-[#525659] p-0 overflow-auto relative scroll-smooth flex justify-center custom-scrollbar">
                <div className="py-12 px-6 flex justify-center min-w-full">
                  <div className="bg-white p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex flex-col items-center justify-center p-20 w-[600px] h-[800px] bg-background">
                          <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                          <p className="text-lg font-bold text-foreground">Rendering Document</p>
                          <p className="text-sm text-muted-foreground">Preparing specialized text layer...</p>
                        </div>
                      }
                      error={
                        <div className="flex flex-col items-center justify-center p-20 bg-background text-destructive gap-4">
                          <AlertCircle className="h-16 w-16" />
                          <h3 className="text-xl font-bold">Failed to load PDF</h3>
                          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                      }
                    >
                      <Page 
                        pageNumber={pageNumber} 
                        scale={scale}
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                        customTextRenderer={highlightText}
                        className="transition-transform duration-300 ease-out"
                      />
                    </Document>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
