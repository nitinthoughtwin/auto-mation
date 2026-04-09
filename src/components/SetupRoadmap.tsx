'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tv,
  FolderOpen,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  isActive: boolean;
  queuedVideos?: number;
  uploadTime?: string;
  frequency?: string;
}

interface SetupRoadmapProps {
  channels: Channel[];
  totalQueuedVideos: number;
  onConnectChannel: () => void;
  onOpenVideoLibrary: () => void;
  onManageChannel: (channel: Channel) => void;
}

const MIN_QUEUE_THRESHOLD = 3;

export default function SetupRoadmap({
  channels,
  totalQueuedVideos,
  onConnectChannel,
  onOpenVideoLibrary,
  onManageChannel,
}: SetupRoadmapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const step1Done = channels.length > 0;
  const step2Done = totalQueuedVideos >= MIN_QUEUE_THRESHOLD;
  const step3Done = channels.some((c) => c.isActive);

  const stepsComplete = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const allDone = stepsComplete === 3;

  // Auto-hide after all steps done
  if (allDone || dismissed) return null;

  const steps = [
    {
      number: 1,
      done: step1Done,
      icon: <Tv className="h-5 w-5" />,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      title: 'Connect a YouTube Channel',
      description: step1Done
        ? `${channels.length} channel${channels.length > 1 ? 's' : ''} connected`
        : 'Link your YouTube channel — takes less than 2 minutes.',
      cta: !step1Done && (
        <Button
          size="sm"
          className="gradient-primary text-white h-9 px-4"
          onClick={onConnectChannel}
        >
          Connect Channel
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
    },
    {
      number: 2,
      done: step2Done,
      icon: <FolderOpen className="h-5 w-5" />,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40',
      title: 'Add Videos to Your Queue',
      description: step2Done
        ? `${totalQueuedVideos} videos in queue — you're ready!`
        : totalQueuedVideos > 0
        ? `Only ${totalQueuedVideos} video${totalQueuedVideos > 1 ? 's' : ''} in queue — add ${MIN_QUEUE_THRESHOLD - totalQueuedVideos} more to get started.`
        : 'Import your reels bundle from Google Drive or browse the video library.',
      cta: !step2Done && (
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-9 px-4"
          onClick={onOpenVideoLibrary}
          disabled={!step1Done}
        >
          Browse Library
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
    },
    {
      number: 3,
      done: step3Done,
      icon: <Calendar className="h-5 w-5" />,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      title: 'Set Schedule & Activate',
      description: step3Done
        ? 'Schedule is active — your channel is earning on autopilot!'
        : 'Set how often to upload and activate. Your videos will go live automatically.',
      cta: !step3Done && channels.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-4"
          onClick={() => onManageChannel(channels[0])}
        >
          Configure Schedule
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
      {/* Top gradient accent */}
      <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(stepsComplete / 3) * 94.25} 94.25`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-bold text-primary">{stepsComplete}/3</span>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">Start Earning from YouTube</h2>
            <p className="text-xs text-muted-foreground">
              {stepsComplete === 0
                ? '3 quick steps to get your channel running on autopilot'
                : stepsComplete === 1
                ? '1 of 3 done — keep going!'
                : '2 of 3 done — almost there!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!collapsed && (
        <div className="px-4 pb-1">
          <Progress value={(stepsComplete / 3) * 100} className="h-1.5" />
        </div>
      )}

      {/* Steps */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                step.done
                  ? 'bg-green-50/50 dark:bg-green-950/20'
                  : i === steps.findIndex((s) => !s.done)
                  ? 'bg-primary/5 border border-primary/20'
                  : 'opacity-50'
              }`}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {step.done ? (
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className={`w-7 h-7 rounded-full ${step.iconBg} ${step.iconColor} flex items-center justify-center`}>
                    {step.icon}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {step.description}
                </p>
                {step.cta && (
                  <div className="mt-2">
                    {step.cta}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
