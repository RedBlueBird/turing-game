export const PLAYER_COUNT_OPTIONS = [2];
export const QUESTIONS_PER_ROUND_OPTIONS = [1, 2, 3];
export const TIME_OPTIONS = [30, 45, 60, 90, 120, 1200];
export const THEMES = [
  { id: 'general', label: 'General' },
  { id: 'quirky', label: 'Quirky' },
  { id: 'hypotheticals', label: 'Hypothetical' },
  { id: 'experiences', label: 'Experiences' },
  { id: 'philosophical', label: 'Philosophical' },
  { id: 'romantic', label: 'Romantic' },
] as const;

export type ThemeId = typeof THEMES[number]['id'];

export const ROOM_CODE = {
  CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  LENGTH: 4
} as const; 