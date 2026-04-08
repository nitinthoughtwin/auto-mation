'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';

interface VideoPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  /** Video title shown in header */
  title: string;
  /** Google Drive file ID for iframe embed */
  driveFileId?: string | null;
  /** Direct video URL (R2/blob) — uses <video> tag instead of iframe */
  directUrl?: string | null;
  /** Link to open in Drive/browser */
  externalLink?: string | null;
  externalLinkLabel?: string;
  /** Whether this video is already selected */
  isSelected?: boolean;
  /** If provided, shows a Select/Selected button */
  onSelect?: () => void;
  /** Extra info line below title (e.g. file size) */
  subtitle?: string;
}

export default function VideoPreviewDialog({
  open,
  onClose,
  title,
  driveFileId,
  directUrl,
  externalLink,
  externalLinkLabel = 'Open in Drive',
  isSelected = false,
  onSelect,
  subtitle,
}: VideoPreviewDialogProps) {
  const embedUrl = driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/*
        Mobile-first layout:
        - Full viewport width on mobile, max 4xl on desktop
        - Video at top, fixed 16:9 but capped so buttons always visible
        - Buttons always in view at bottom, never pushed off screen
      */}
      <DialogContent className="w-screen sm:w-[95vw] max-w-4xl p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: '95dvh' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0 bg-background">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {/* <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button> */}
        </div>

        {/* Video — fills available space but never pushes buttons off screen */}
        <div className="bg-black flex-shrink-0 w-full" style={{ aspectRatio: '16/9', maxHeight: 'calc(95dvh - 110px)' }}>
          {directUrl ? (
            <video
              src={directUrl}
              controls
              className="w-full h-full"
              preload="metadata"
              playsInline
            />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : null}
        </div>

        {/* Action buttons — always visible */}
        <div className="flex gap-2 p-3 border-t flex-shrink-0 bg-background flex-wrap">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-9 text-sm">
            Close
          </Button>
          {externalLink && (
            <Button variant="outline" asChild className="flex-1 sm:flex-none h-9 text-sm">
              <a href={externalLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                {externalLinkLabel}
              </a>
            </Button>
          )}
          {/* {onSelect && (
            <Button
              onClick={() => { onSelect(); onClose(); }}
              disabled={isSelected}
              className="flex-1 sm:flex-none h-9 text-sm bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isSelected ? 'Selected' : 'Select Video'}
            </Button>
          )} */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
