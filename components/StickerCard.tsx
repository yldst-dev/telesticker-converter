import React from 'react';
import { StickerImage, ProcessingStatus } from '../types';
import { formatFileSize } from '../services/imageService';
import { Download, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface StickerCardProps {
  item: StickerImage;
  onRemove: (id: string) => void;
}

const StickerCard: React.FC<StickerCardProps> = ({ item, onRemove }) => {
  const isProcessed = item.status === ProcessingStatus.COMPLETED;
  const isProcessing = item.status === ProcessingStatus.PROCESSING;
  const isError = item.status === ProcessingStatus.ERROR;

  const handleDownload = () => {
    if (!item.processedUrl) return;
    const link = document.createElement('a');
    link.href = item.processedUrl;
    link.download = `sticker_${item.originalFile.name.split('.')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95">
      {/* Remove Button */}
      <button 
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row h-full">
        {/* Image Preview Area */}
        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-secondary/30 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r">
          {item.processedUrl ? (
             <img 
               src={item.processedUrl} 
               alt="Processed" 
               className="max-w-full max-h-full object-contain p-2"
             />
          ) : (
             <img 
               src={item.previewUrl} 
               alt="Original" 
               className="max-w-full max-h-full object-contain p-2 opacity-50 grayscale"
             />
          )}
          
          {/* Status Badge */}
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium shadow-sm border flex items-center gap-1.5">
            {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            {isProcessed && <CheckCircle2 className="w-3 h-3 text-green-500" />}
            {isError && <AlertCircle className="w-3 h-3 text-destructive" />}
            {isProcessing ? 'Converting...' : isProcessed ? 'Ready' : isError ? 'Error' : 'Pending'}
          </div>
        </div>

        {/* Info & Actions Area */}
        <div className="flex-1 p-4 flex flex-col justify-center gap-4">
          <div>
            <h3 className="font-medium text-base truncate pr-6" title={item.originalFile.name}>
              {item.originalFile.name}
            </h3>
            
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="opacity-70">Original Size</span>
                <span className="font-medium">{formatFileSize(item.originalFile.size)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="opacity-70">Processed Size</span>
                <span className={`font-medium ${isProcessed && item.sizeKB > 300 ? 'text-destructive' : 'text-primary'}`}>
                  {isProcessed ? `${formatFileSize(item.processedBlob?.size || 0)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1 col-span-2">
                 <span className="opacity-70">Dimensions</span>
                 <span className="font-medium">
                   {isProcessed ? `${item.dimensions.width}x${item.dimensions.height} px` : '-'}
                 </span>
              </div>
            </div>
            
            {isError && (
              <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {item.error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleDownload}
              disabled={!isProcessed}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm w-full sm:w-auto justify-center
                ${isProcessed 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md active:scale-95' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'}
              `}
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerCard;
