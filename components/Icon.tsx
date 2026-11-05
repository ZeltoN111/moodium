import Svg, { Path } from 'react-native-svg';

/**
 * Stroke icon set on a 24×24 grid (Lucide-style geometry). Every icon is a list of path
 * strings, so the whole set renders identically on iOS, Android and web.
 */
const PATHS = {
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-up': ['m18 15-6-6-6 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  minus: ['M5 12h14'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'm21 21-4.3-4.3'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    'M12 2v2',
    'M12 20v2',
    'm4.93 4.93 1.41 1.41',
    'm17.66 17.66 1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'm6.34 17.66-1.41 1.41',
    'm19.07 4.93-1.41 1.41',
  ],
  monitor: ['M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M8 21h8', 'M12 17v4'],
  briefcase: [
    'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  ],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 7-10 6L2 7'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  alert: [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    'M12 9v4',
    'M12 17h.01',
  ],
  'check-circle': ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 16v-4', 'M12 8h.01'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  globe: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    'M2 12h20',
    'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  ],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  ],
  sparkles: [
    'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z',
  ],
  pen: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z'],
  calendar: [
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    'M16 2v4',
    'M8 2v4',
    'M3 10h18',
  ],
  chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  'trending-up': ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
  logo: ['M6 20V5', 'M3.5 7.5 6 4.5l2.5 3', 'M6 13c0-2.5 1.5-4 3.5-4S12 10.5 12 13v7', 'M12 13c0-2.5 1.5-4 3.5-4S18 10.5 18 13v6.5', 'M15.5 16.5 18 19.5l2.5-3'],
  'trending-down': ['M22 17 13.5 8.5 8.5 13.5 2 7', 'M16 17h6v-6'],
  hash: ['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 6v6l4 2'],
  file: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
  ],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  // Mood faces: face outline + eyes + mouth, from awful (1) to great (5).
  'mood-1': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    'M16 17s-1.5-3-4-3-4 3-4 3',
    'M7.5 7.5 10 8.5',
    'M16.5 7.5 14 8.5',
    'M9 11h.01',
    'M15 11h.01',
  ],
  'mood-2': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    'M16 16s-1.5-2-4-2-4 2-4 2',
    'M9 9.5h.01',
    'M15 9.5h.01',
  ],
  'mood-3': ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M8 15h8', 'M9 9.5h.01', 'M15 9.5h.01'],
  'mood-4': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    'M8 14s1.5 2 4 2 4-2 4-2',
    'M9 9.5h.01',
    'M15 9.5h.01',
  ],
  'mood-5': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    'M7.5 13.5h9a4.5 4.5 0 0 1-9 0Z',
    'M9 9.5h.01',
    'M15 9.5h.01',
  ],
} as const;

export type IconName = keyof typeof PATHS;

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export default function Icon({ name, size = 22, color, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, index) => (
        <Path
          key={index}
          d={d}
          stroke={color}
          strokeWidth={name.startsWith('mood-') && d.endsWith('.01') ? strokeWidth + 1 : strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export function moodIcon(value: number): IconName {
  return `mood-${Math.min(5, Math.max(1, Math.round(value)))}` as IconName;
}
