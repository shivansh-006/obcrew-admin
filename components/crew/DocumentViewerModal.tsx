'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2, FileText, Download } from 'lucide-react';
import { getDocumentFile, type CrewDocument } from '@/lib/crew-api';
import { CrewErrorState } from '@/components/crew/CrewErrorState';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

interface DocumentViewerModalProps {
  crewId: string;
  doc: CrewDocument;
  onClose: () => void;
}

export function DocumentViewerModal({ crewId, doc, onClose }: DocumentViewerModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const { data: blob, isPending, isError, error, refetch } = useQuery({
    queryKey: ['crew', 'file', crewId, doc.id],
    queryFn: () => getDocumentFile(crewId, doc.id),
    staleTime: 5 * 60_000,
  });

  // Turn the downloaded file into a temporary URL and free it when done
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setFileUrl(null);
    };
  }, [blob]);

  // Close on Esc and stop the page behind from scrolling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const fileType = blob?.type ?? '';
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  // Width of the image when it fits the viewer; zoom multiplies this
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const box = viewportRef.current;
    if (!box) return;
    const scale = Math.min(
      (box.clientWidth - 32) / img.naturalWidth,
      (box.clientHeight - 32) / img.naturalHeight,
      1
    );
    setFitWidth(Math.max(1, Math.floor(img.naturalWidth * scale)));
  };

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${formatLabel(doc.docType)} preview`}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-sm font-bold text-slate-900 truncate">{formatLabel(doc.docType)}</span>
            <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
              {formatLabel(doc.status)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isImage && fileUrl && (
              <>
                <button
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  title="Zoom out"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-xs font-semibold text-slate-700">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  title="Zoom in"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={resetZoom}
                  disabled={zoom === 1}
                  title="Reset zoom"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <span className="w-px h-5 bg-slate-200 mx-1" />
              </>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={viewportRef} className="h-[70vh] bg-slate-50 overflow-auto flex">
          {isPending ? (
            <div className="m-auto flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#074139]" />
              Loading document…
            </div>
        ) : isError ? (
            <div className="m-auto">
              <CrewErrorState
                error={error}
                onRetry={() => refetch()}
                notFoundText="Document file not found."
              />
            </div>
          ) : !fileUrl ? null : isImage ? (
            <img
              src={fileUrl}
              alt={formatLabel(doc.docType)}
              onLoad={handleImageLoad}
              style={fitWidth ? { width: fitWidth * zoom } : undefined}
              className={`m-auto p-4 max-w-none ${fitWidth ? '' : 'invisible'}`}
            />
          ) : isPdf ? (
            <iframe src={fileUrl} title={formatLabel(doc.docType)} className="w-full h-full border-0 bg-white" />
          ) : (
            <div className="m-auto flex flex-col items-center gap-3 text-center px-6">
              <p className="text-xs text-slate-500">Preview not available for this file type.</p>
              <a
                href={fileUrl}
                download={doc.docType}
                className="px-3 py-1.5 rounded-lg bg-[#074139] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}