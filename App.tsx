import React, { useState, useEffect } from 'react';
import Dropzone from './components/Dropzone';
import StickerCard from './components/StickerCard';
import { StickerImage, ProcessingStatus } from './types';
import { processImageForSticker } from './services/imageService';
import { Moon, Sun, Sticker, Download, Trash2, Github, Image as ImageIcon, Loader2 } from 'lucide-react';
import JSZip from 'jszip';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [files, setFiles] = useState<StickerImage[]>([]);
  const [isZipping, setIsZipping] = useState(false);

  // Initialize theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleFilesDropped = (newFiles: File[]) => {
    const newStickerImages: StickerImage[] = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      previewUrl: URL.createObjectURL(file),
      processedBlob: null,
      processedUrl: null,
      status: ProcessingStatus.IDLE,
      dimensions: { width: 0, height: 0 },
      sizeKB: 0,
    }));

    setFiles(prev => [...prev, ...newStickerImages]);
    
    // Auto-start processing for UX
    newStickerImages.forEach(img => processSingleImage(img.id, img.originalFile));
  };

  const processSingleImage = async (id: string, file: File) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: ProcessingStatus.PROCESSING } : f));

    try {
      const { blob, width, height } = await processImageForSticker(file);
      const processedUrl = URL.createObjectURL(blob);
      
      setFiles(prev => prev.map(f => {
        if (f.id !== id) return f;
        return {
          ...f,
          processedBlob: blob,
          processedUrl,
          dimensions: { width, height },
          sizeKB: blob.size / 1024,
          status: ProcessingStatus.COMPLETED
        };
      }));

    } catch (error) {
      console.error("Processing failed", error);
      const message = error instanceof Error ? error.message : "Conversion failed";
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: ProcessingStatus.ERROR, error: message } : f));
    }
  };

  const handleRemove = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
      if (fileToRemove?.processedUrl) URL.revokeObjectURL(fileToRemove.processedUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleDownloadAll = async () => {
    const processedFiles = files.filter(f => f.status === ProcessingStatus.COMPLETED && f.processedBlob);
    
    if (processedFiles.length === 0) return;
    
    setIsZipping(true);

    try {
      const zip = new JSZip();
      
      processedFiles.forEach(f => {
        // Get the original name without extension
        const originalName = f.originalFile.name.substring(0, f.originalFile.name.lastIndexOf('.')) || f.originalFile.name;
        // Ensure clean filename
        const cleanName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        if (f.processedBlob) {
          zip.file(`${cleanName}.png`, f.processedBlob);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stickers_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip files:", error);
      alert("Failed to create zip file.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleClearAll = () => {
    files.forEach(f => {
       if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
       if (f.processedUrl) URL.revokeObjectURL(f.processedUrl);
    });
    setFiles([]);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sticker className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">TeleSticker Converter</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a 
              href="#"
              className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl space-y-12">
        
        {/* Hero / Intro */}
        <div className="text-center space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="flex justify-center mb-4">
             <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20">
                100% Client-Side
             </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Telegram Stickers <br/>
            <span className="text-primary bg-clip-text">Made Simple</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Convert your images to high-quality 512px PNG stickers. 
            Dynamically tuned to stay between <span className="font-semibold text-foreground">400KB</span> and <span className="font-semibold text-foreground">500KB</span> without losing details.
          </p>
        </div>

        {/* Dropzone */}
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
          <Dropzone onFilesDropped={handleFilesDropped} />
        </div>

        {/* Action Bar */}
        {files.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b animate-in fade-in">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>{files.length} file{files.length !== 1 && 's'} in queue</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={handleClearAll}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                disabled={isZipping}
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
              <button 
                onClick={handleDownloadAll}
                disabled={isZipping}
                className={`
                  flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg transition-colors
                  ${isZipping ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Zipping...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download All (ZIP)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
          {files.map((file) => (
            <StickerCard 
              key={file.id} 
              item={file} 
              onRemove={handleRemove}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-secondary/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Your images remain private and are processed locally on your device.</p>
          <p className="mt-2 opacity-60">&copy; {new Date().getFullYear()} TeleSticker Converter.</p>
        </div>
      </footer>
    </div>
  );
}
