import { ROOM_CODE } from "@/configs/consts";
import seedrandom from 'seedrandom';

/**
 * Generates a deterministic random number between min and max (inclusive) using a seed.
 * @param seed The seed string to initialize the random number generator
 * @param min The minimum value (inclusive)
 * @param max The maximum value (inclusive)
 * @returns A random number between min and max
 */
export function getSeededRandom(seed: string, min: number, max: number): number {
  const rng = seedrandom(seed);
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Returns a new array with the shuffled elements, leaving the original array unchanged.
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE.LENGTH) return false;
  return code.split('').every(char => ROOM_CODE.CHARS.includes(char));
} 