import React from 'react';
import * as Phosphor from '@phosphor-icons/react';
import { Wifi as LucideWifi, CheckCircle as LucideCheckCircle, Projector as LucideProjector, Monitor as LucideMonitor, Users as LucideUsers, Edit as LucideEdit } from 'lucide-react';

// Try to resolve a Phosphor icon dynamically from a set of candidate names.
const phosphorIndex = Phosphor as unknown as Record<string, React.ElementType | undefined>;
export const getPhosphorIcon = (candidates: string[], props: any = {}) => {
  for (const name of candidates) {
    const Comp = phosphorIndex[name] ?? phosphorIndex[`${name}Icon`];
    if (Comp) return <Comp {...props} />;
  }
  return null;
};

export const equipmentIcons: { [key: string]: React.ReactNode } = {
  'Projector': getPhosphorIcon(['ProjectorScreenChart', 'Projector', 'ProjectorScreen'], { className: 'h-4 w-4' }) || <LucideProjector className="h-4 w-4" />,
  'Computer': getPhosphorIcon(['Monitor', 'Desktop'], { className: 'h-4 w-4' }) || <LucideMonitor className="h-4 w-4" />,
  'Computers': getPhosphorIcon(['Monitor', 'Desktop'], { className: 'h-4 w-4' }) || <LucideMonitor className="h-4 w-4" />,
  // Prefer phosphor when available, otherwise use lucide wifi as a reliable fallback
  'WiFi': getPhosphorIcon(['Wifi', 'WifiSimple'], { className: 'h-4 w-4' }) || <LucideWifi className="h-4 w-4" />,
  'Whiteboard': getPhosphorIcon(['Chalkboard', 'ChalkboardSimple'], { className: 'h-4 w-4' }) || <LucideEdit className="h-4 w-4" />,
  'TV': getPhosphorIcon(['Television', 'Tv', 'MonitorPlay'], { className: 'h-4 w-4' }) || <LucideMonitor className="h-4 w-4" />,
  'Podium': getPhosphorIcon(['Podium', 'Presentation', 'Microphone'], { className: 'h-4 w-4' }) || <LucideUsers className="h-4 w-4" />,
  'Speakers': getPhosphorIcon(['SpeakerHigh', 'SpeakerSimple'], { className: 'h-4 w-4' }) || null,
  'Speaker': getPhosphorIcon(['SpeakerHigh', 'SpeakerSimple'], { className: 'h-4 w-4' }) || null,
  'Air Conditioner': getPhosphorIcon(['Fan', 'FanSimple', 'Snowflake'], { className: 'h-4 w-4' }) || null,
  'AC': getPhosphorIcon(['Fan', 'FanSimple', 'Snowflake'], { className: 'h-4 w-4' }) || null,
  'Microphone': getPhosphorIcon(['Microphone', 'MicrophoneStage'], { className: 'h-4 w-4' }) || null,
  'Camera': getPhosphorIcon(['Camera', 'VideoCamera', 'Webcam'], { className: 'h-4 w-4' }) || null,
  'Printer': getPhosphorIcon(['Printer', 'PrinterDuotone'], { className: 'h-4 w-4' }) || null,
  'Scanner': getPhosphorIcon(['Scan', 'Scanner'], { className: 'h-4 w-4' }) || null,
  'Document Camera': getPhosphorIcon(['VideoCamera', 'Camera'], { className: 'h-4 w-4' }) || null,
  'Smart Board': getPhosphorIcon(['DeviceTablet', 'MonitorPlay', 'Chalkboard'], { className: 'h-4 w-4' }) || <LucideMonitor className="h-4 w-4" />,
  'Visualizer': getPhosphorIcon(['Eye', 'VideoCamera'], { className: 'h-4 w-4' }) || null,
  'DVD Player': getPhosphorIcon(['Disc', 'CirclesFour'], { className: 'h-4 w-4' }) || null,
  'VCR': getPhosphorIcon(['Video', 'FilmStrip'], { className: 'h-4 w-4' }) || null,
};

const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();

// Robust lookup for equipment icons: normalized exact match, singular/plural, WiFi fallback
export const getIconForEquipment = (eq?: string) => {
  if (!eq) return null;
  const rawKey = Object.keys(equipmentIcons).find(k => normalize(k) === normalize(eq));
  if (rawKey && equipmentIcons[rawKey]) return equipmentIcons[rawKey];
  const singularAttempt = eq.endsWith('s') ? eq.slice(0, -1) : `${eq}s`;
  const spKey = Object.keys(equipmentIcons).find(k => normalize(k) === normalize(singularAttempt));
  if (spKey && equipmentIcons[spKey]) return equipmentIcons[spKey];

  // wifi fallback (only match 'wifi' to avoid collisions with words like 'whiteboard')
  if (normalize(eq).includes('wifi')) {
    return <LucideWifi className="h-4 w-4" />;
  }

  // generic fallback icon (small, neutral) — used in some components previously
  return <LucideCheckCircle className="h-4 w-4 text-gray-500" />;
};

export default equipmentIcons;
