import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropzoneProps {
  onFilesDropped: (files: File[]) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => 
        file.type.startsWith('image/')
      );
      onFilesDropped(validFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = (Array.from(e.target.files) as File[]).filter(file => 
        file.type.startsWith('image/')
      );
      onFilesDropped(validFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
        ${isDragging 
          ? 'border-primary bg-primary/10 scale-[1.01]' 
          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        multiple
        accept="image/*"
      />
      
      <div className="flex flex-col items-center gap-4 p-4 text-center">
        <div className={`p-4 rounded-full bg-background shadow-sm ${isDragging ? 'animate-bounce' : ''}`}>
          <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">
            Drag & drop images here
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        <div className="text-xs text-muted-foreground/70 bg-secondary/50 px-3 py-1 rounded-full">
          Supports PNG, JPG, WEBP, GIF
        </div>
      </div>
    </div>
  );
};

export default Dropzone;