import { useState, useRef, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export default function PDFUpload({ onFileSelect, selectedFile }: PDFUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground truncate max-w-[200px]">
                {selectedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">
            Drop your PDF here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Only PDF files are accepted
          </p>
        </div>
      </div>
    </div>
  );
}
