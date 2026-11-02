/**
 * Content moderation filter to keep comments safe, positive, and abuse-free.
 * Replaces abusive/vulgar words with clean asterisks (***) for safe community standards.
 */

// Common abusive / profanity patterns (Hindi, Hinglish, English)
const ABUSIVE_PATTERNS = [
  /\b(mc|bc|bkl|bsdk|chutiya|chutiye|madarchod|behenchod|gaand|harami|kamina|kutiya|randi|saale|laude|lodu|bhosdike|bhosdi)\b/gi,
  /\b(fuck|shit|bitch|asshole|bastard|dick|pussy|cunt|motherfucker|whore)\b/gi,
  /(मादरचोद|बहनचोद|चूतिया|हरामी|कमीना|गांड|लौड़ा|भोसड़ी)/g,
];

export function sanitizeComment(text: string): { cleanedText: string; hasAbuse: boolean } {
  let cleaned = text;
  let hasAbuse = false;

  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(cleaned)) {
      hasAbuse = true;
      cleaned = cleaned.replace(pattern, (match) => '*'.repeat(Math.max(3, match.length)));
    }
  }

  return { cleanedText: cleaned, hasAbuse };
}

// Preset popular Indian social media voice comment quick-phrases for quick suggestions
export const VOICE_SUGGESTIONS = [
  '🔥 बहुत ही शानदार वीडियो भाई!',
  '❤️ Love this flow! Amazing reel',
  '👏 Kya energy hai super bhai!',
  '✨ Next level content, keep going!',
  '🙌 Best reel on my feed today!',
];
