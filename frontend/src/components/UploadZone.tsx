import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  accept: Record<string, string[]>;
  label: string;
  multiple?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onUpload,
  accept,
  label,
  multiple = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        acceptedFiles.forEach(onUpload);
      } else if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload, multiple],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary"}`}
    >
      <input {...getInputProps()} />
      <div className="p-4 bg-muted rounded-full mb-4">
        <UploadCloud size={40} className="text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-2">
        {isDragActive
          ? "Отпустите файл здесь..."
          : "Перетащите файл или кликните для выбора"}
      </p>
    </div>
  );
};

export default UploadZone;
