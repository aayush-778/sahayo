import { View } from 'react-native';
import { Text } from './Text';

export interface AvatarProps {
  /** The person's name. Initials are derived from it. */
  name: string;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Up to two initials, taken from the first and last word of a name.
 *
 * Works for Devanagari as readily as for Latin — "आरव कुमार" gives "आकु",
 * since a Devanagari "letter" is a consonant plus its vowel sign and taking
 * only the first code point would strip the vowel and produce a different
 * sound. Two code points per word keeps the syllable intact.
 */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const isDevanagari = /[ऀ-ॿ]/.test(name);
  const take = (word: string) => (isDevanagari ? word.slice(0, 2) : word.slice(0, 1).toUpperCase());

  if (words.length === 1) return take(words[0]);
  return take(words[0]) + take(words[words.length - 1]);
}

const SIZE_CLASS = {
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
} as const;

const TEXT_CLASS = {
  md: 'text-sm',
  lg: 'text-xl',
} as const;

/**
 * A circular initials avatar.
 *
 * There is no photograph anywhere in this product — nobody uploads one at
 * signup, and a single stock face for every user would be worse than none.
 * Initials at least change with the person.
 */
export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = initialsFor(name);

  return (
    <View
      className={`items-center justify-center rounded-full bg-brand-primary-tint ${SIZE_CLASS[size]} ${className}`}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Text weight="bold" className={`text-brand-primary ${TEXT_CLASS[size]}`}>
        {initials}
      </Text>
    </View>
  );
}
