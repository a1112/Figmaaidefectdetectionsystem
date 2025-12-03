import { useCallback } from 'react';
import { Upload, FileUp } from 'lucide-react';

interface UploadZoneProps {
  onImageUpload: (imageUrl: string) => void;
}

export function UploadZone({ onImageUpload }: UploadZoneProps) {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onImageUpload(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onImageUpload(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="group border-2 border-dashed border-border hover:border-primary/50 bg-card/30 hover:bg-card/50 rounded-none p-12 text-center transition-all cursor-pointer w-full max-w-lg mx-auto"
      >
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
          <div className="p-4 bg-secondary rounded-full group-hover:bg-primary/20 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">DRAG & DROP IMAGE</p>
            <p className="text-sm text-muted-foreground mt-1">OR CLICK TO BROWSE FILES</p>
          </div>
          <div className="text-xs text-muted-foreground/60 border-t border-border pt-4 mt-2 w-full">
            SUPPORTED FORMATS: JPG, PNG, BMP
          </div>
        </label>
      </div>
    </div>
  );
}
