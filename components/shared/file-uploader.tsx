"use client";

import * as React from "react";
import { Paperclip, X, FileText, Image as ImageIcon, File, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface FileUploaderProps {
  /** Called with the final URL after the server action uploads it */
  onUpload: (file: File) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
  files: UploadedFile[];
  onRemove: (url: string) => void;
  maxFiles?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="size-4 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="size-4 text-red-500" />;
  return <File className="size-4 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({
  onUpload,
  files,
  onRemove,
  maxFiles = 5,
  label = "Attachments",
  hint = "PDF, images, docs, zip — max 10 MB each",
  disabled = false,
}: FileUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (files.length >= maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    setError(null);
    setUploading(true);

    const toUpload = Array.from(fileList).slice(0, maxFiles - files.length);

    for (const file of toUpload) {
      const result = await onUpload(file);
      if (!result.ok) {
        setError(result.error);
        break;
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  const canAddMore = files.length < maxFiles && !disabled;

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}{" "}
        <span className="normal-case font-normal text-muted-foreground/70">
          ({files.length}/{maxFiles})
        </span>
      </label>

      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="size-5 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">
            {uploading
              ? "Uploading…"
              : "Click to upload or drag & drop"}
          </span>
          <span className="text-xs text-muted-foreground/60">{hint}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => processFiles(e.target.files)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="size-3 shrink-0" />
          {error}
        </p>
      )}

      {/* Uploaded file list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.url}
              className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {fileIcon(f.type)}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium hover:underline text-foreground"
              >
                {f.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(f.size)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(f.url)}
                  className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove file"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
