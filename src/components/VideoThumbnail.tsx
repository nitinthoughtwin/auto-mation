'use client';

import { useState } from 'react';
import { Video } from 'lucide-react';

interface VideoThumbnailProps {
  /** Google Drive file ID — used to build the thumbnail URL */
  driveFileId?: string | null;
  /** Direct thumbnail URL (overrides driveFileId-based URL) */
  thumbnailUrl?: string | null;
  /** Video name — used for gradient fallback color */
  name: string;
  className?: string;
}

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-green-500 to-emerald-500',
  'from-red-500 to-pink-500',
  'from-cyan-500 to-blue-500',
];

function getGradient(name: string) {
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[index];
}

/** Builds the best public thumbnail URL for a Drive file */
export function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h225`;
}

/** Extract Drive file ID from any Drive URL or bare ID */
export function extractDriveFileId(fileIdOrUrl: string | null): string | null {
  if (!fileIdOrUrl) return null;
  if (!fileIdOrUrl.startsWith('http')) return fileIdOrUrl; // bare ID
  const m1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
  if (m1) return m1[1];
  const m2 = fileIdOrUrl.match(/\/file\/d\/([^/?]+)/);
  if (m2) return m2[1];
  const m3 = fileIdOrUrl.match(/\/d\/([^/?=]+)/);
  if (m3) return m3[1];
  return null;
}

/**
 * Shared video thumbnail component used across:
 * - Video Library Browser
 * - Public Drive Browser
 * - Dashboard Queue table
 * - Admin video library panel
 *
 * Shows a loading skeleton while the image loads, then the actual thumbnail.
 * Falls back to a colored gradient with a Video icon if the image fails to load.
 */
export default function VideoThumbnail({
  driveFileId,
  thumbnailUrl,
  name,
  className = 'w-full h-full',
}: VideoThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Resolve the best thumbnail source
  const src = (() => {
    if (thumbnailUrl && !error) return thumbnailUrl;
    if (driveFileId && !error) return getDriveThumbnailUrl(driveFileId);
    return null;
  })();

  const gradient = getGradient(name);
  const cleanName = name.replace(/\.[^/.]+$/, '').substring(0, 24);

  if (!src || error) {
    // Fallback: gradient with video icon
    return (
      <div className={`${className} bg-gradient-to-br ${gradient} flex flex-col items-center justify-center`}>
        <Video className="h-7 w-7 text-white/80 mb-1" />
        <p className="text-white/80 text-[10px] font-medium text-center px-1 line-clamp-2 max-w-[90px]">
          {cleanName}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={name}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    </div>
  );
}
