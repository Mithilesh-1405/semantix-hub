import { useState, useEffect, useCallback, useMemo } from 'react';
import PDFUpload from '@/components/PDFUpload';
import PDFHighlighter from '@/components/PDFHighlighter';
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
  Layout,
  Loader2
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Semantic PDF Explorer
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            Analyze and search PDF documents based on semantic meaning.
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
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <Layout className="h-3.5 w-3.5" />
            New Search
          </Button>
        )}
      </div>

      {!hasSearched ? (
        /* Initial Upload & Search UI */
        <div className="max-w-3xl mx-auto space-y-6 py-4">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-[#0077b6]" />
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Upload className="h-4.5 w-4.5 text-primary" />
                  1. Choose your document
                </Label>
                <div className="p-0.5 rounded-xl bg-muted/30">
                  <PDFUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchQuery" className="text-base font-semibold flex items-center gap-2">
                  <Search className="h-4.5 w-4.5 text-primary" />
                  2. What are you looking for?
                </Label>
                <Textarea
                  id="searchQuery"
                  placeholder="e.g., Describe what meaning you want to find..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[120px] text-sm p-3 rounded-xl resize-none focus-visible:ring-primary bg-background/50 border-border"
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full gradient-primary text-primary-foreground font-bold h-10 text-xs shadow-md transition-all active-scale rounded-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Indexing & Searching...
                  </div>
                ) : (
                  <>
                    <Search className="mr-1.5 h-4 w-4" />
                    Search Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {[
              { title: "Semantic Analysis", desc: "Understands context, not just keywords" },
              { title: "Instant Highlights", desc: "Finds relevant segments immediately" },
              { title: "User History", desc: "Track previous searches" }
            ].map((feature, i) => (
              <div key={i} className="space-y-1.5 p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-muted/20 hover:scale-[1.01] active-scale transition-all duration-300">
                <h3 className="font-bold text-xs text-foreground">{feature.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Results & Preview Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in slide-in-from-bottom-4 duration-500">
          {/* Sidebar: Results List */}
          <div className="lg:col-span-4 space-y-4 flex flex-col h-[780px]">
            <Card className="border-none shadow-lg bg-card/80 backdrop-blur-md flex-none">
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Matches
                    <Badge variant="secondary" className="ml-1.5 bg-primary/10 text-primary border-none font-mono text-xs">
                      {searchResults.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <ScrollArea className="flex-1 rounded-xl border bg-background/50 backdrop-blur shadow-inner custom-scrollbar">
              <div className="p-3 space-y-3">
                {searchResults.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-20" />
                    <p className="text-muted-foreground text-sm font-medium">No direct matches found.</p>
                    <p className="text-xs text-muted-foreground px-6">Try rephrasing your search query.</p>
                  </div>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => goToResult(idx)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border group relative overflow-hidden active-scale ${activeResultIndex === idx
                        ? 'bg-primary/[0.03] border-primary/60 shadow-sm'
                        : 'bg-background border-border/80 hover:border-border hover:shadow-sm'
                        }`}
                    >
                      {activeResultIndex === idx && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-background text-[10px] uppercase font-semibold tracking-tighter px-1.5 py-0.5">
                          Page {result.page}
                        </Badge>
                        <div className="flex items-center gap-1 text-primary font-semibold text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                          <Percent className="h-2.5 w-2.5" />
                          {result.similarityPercent}%
                        </div>
                      </div>
                      <p className="text-xs font-normal text-foreground/90 leading-relaxed line-clamp-3 group-hover:text-foreground">
                        {result.text}
                      </p>
                      <div className="mt-2 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-primary font-semibold uppercase tracking-wider flex items-center gap-0.5">
                          View on page <ChevronRight className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Search Query Reminder */}
            <Card className="bg-muted/40 border-none">
              <CardContent className="p-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Searching for: <span className="text-foreground font-medium italic">"{searchQuery}"</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main: PDF Viewer */}
          <div className="lg:col-span-8 h-[780px] flex flex-col gap-3">
            <Card className="border-none shadow-xl bg-background overflow-hidden flex flex-col h-full ring-1 ring-black/5">
              <div className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between flex-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-background rounded-lg border p-0.5 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="h-7 w-7 hover:bg-muted rounded-md"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex items-center gap-0.5 px-3 border-x text-xs font-semibold min-w-[80px] justify-center">
                      <span>{pageNumber}</span>
                      <span className="text-muted-foreground font-normal">/</span>
                      <span>{numPages || '--'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPageNumber(Math.min(numPages || pageNumber, pageNumber + 1))}
                      disabled={pageNumber >= (numPages || 1)}
                      className="h-7 w-7 hover:bg-muted rounded-md"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="hidden sm:flex items-center bg-background rounded-lg border p-0.5 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.2))} className="h-7 w-7 font-bold rounded-md">-</Button>
                    <span className="text-xs font-semibold px-2.5 border-x min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(2.5, scale + 0.2))} className="h-7 w-7 font-bold rounded-md">+</Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl || '', '_blank')} className="hidden sm:flex items-center gap-1.5 bg-background h-8 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Fullscreen
                  </Button>
                  {pdfUrl && (
                    <Button size="sm" asChild className="gradient-primary text-primary-foreground shadow-md h-8 text-xs">
                      <a href={pdfUrl} download={selectedFile?.name || 'document.pdf'} className="flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Save
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="flex-1 bg-[#525659] p-0 overflow-auto relative scroll-smooth flex justify-center custom-scrollbar">
                <div className="py-6 px-4 flex justify-center min-w-full">
                  <div className="bg-white p-0 shadow-[0_12px_30px_rgba(0,0,0,0.25)] rounded-sm relative">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex flex-col items-center justify-center p-12 w-[600px] h-[680px] bg-background">
                          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                          <p className="text-base font-bold text-foreground">Rendering Document</p>
                          <p className="text-xs text-muted-foreground">Preparing specialized text layer...</p>
                        </div>
                      }
                      error={
                        <div className="flex flex-col items-center justify-center p-12 bg-background text-destructive gap-4">
                          <AlertCircle className="h-12 w-12" />
                          <h3 className="text-lg font-bold">Failed to load PDF</h3>
                          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                        className="transition-transform duration-300 ease-out"
                      />
                    </Document>
                    {activeResultIndex !== null && searchResults[activeResultIndex] && (
                      <PDFHighlighter
                        activeResult={searchResults[activeResultIndex]}
                        currentPage={pageNumber}
                        scale={scale}
                      />
                    )}
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
