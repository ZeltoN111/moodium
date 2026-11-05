/**
 * Dictionary-based sentiment for short diary notes, Ukrainian + English.
 * Words are matched by prefix ("втом" catches "втомився", "втома", "втомлена"); short or
 * ambiguous words are matched exactly. A negation right before a hit flips it
 * ("не втомився", "not happy").
 */

const NEGATIVE_STEMS = [
  // uk
  'втом', 'втомл', 'виснаж', 'вигор', 'вигоран', 'стрес', 'тривог', 'тривож', 'страх', 'переживаю',
  'нервов', 'нервув', 'дратув', 'дратує', 'злий', 'зліст', 'злюсь', 'безсонн', 'дедлайн', 'завал',
  'перевантаж', 'депрес', 'самотн', 'сумн', 'сумув', 'сумую', 'байдуж', 'апат', 'безнад', 'болить',
  'біль', 'погано', 'жахлив', 'кошмар', 'зрив', 'паніка', 'панічн', 'тяжк', 'важк', 'ненавиджу',
  'набридл', 'марн', 'тужл', 'плакав', 'плакал', 'безсил', 'розбит', 'перепрацю',
  'виматер', 'пригнічен', 'огидн', 'проблем', 'конфлікт', 'сварк',
  // en
  'tired', 'exhaust', 'burnt', 'burnout', 'burning', 'stress', 'anxi', 'overwhelm', 'worr', 'deadline',
  'depress', 'lonely', 'angry', 'irritat', 'frustrat', 'hopeless', 'insomnia', 'awful', 'terrible',
  'horrible', 'hated', 'hating', 'panic', 'drain', 'miserable', 'numb', 'apath', 'pointless',
  'overwork', 'crying', 'cried', 'upset', 'nervous', 'guilt', 'struggl', 'conflict', 'fight',
];
const NEGATIVE_WORDS = new Set([
  'сум', 'зле', 'тяжко', 'важко', 'лінь', 'sad', 'bad', 'sick', 'cry', 'hate', 'pain', 'meh', 'ugh',
  'worse', 'worst', 'burn', 'fail', 'failed',
]);

const POSITIVE_STEMS = [
  // uk
  'радіс', 'радий', 'щаслив', 'чудов', 'відмінн', 'гарн', 'класн', 'супер', 'задоволен', 'енергі',
  'натхнен', 'спокій', 'спокійн', 'відпочи', 'вдячн', 'люблю', 'успіх', 'вдал', 'приємн', 'весел',
  'бадьор', 'мотивов', 'горджусь', 'продуктивн', 'розслабл', 'кайф', 'прекрасн', 'неймовірн',
  'підтримк', 'смачн', 'усміх', 'сміявся', 'сміялась', 'гуляв', 'прогулян',
  // en
  'happy', 'great', 'grateful', 'thank', 'calm', 'relax', 'energ', 'motivat', 'proud', 'excited',
  'enjoy', 'peace', 'success', 'wonderful', 'amazing', 'fantastic', 'awesome', 'cheerful', 'satisf',
  'inspir', 'refresh', 'accomplish', 'productive', 'laugh', 'smil', 'support',
];
const POSITIVE_WORDS = new Set([
  'добре', 'гарно', 'рада', 'fine', 'good', 'fun', 'love', 'nice', 'joy', 'rest', 'rested', 'restful',
  'better', 'best', 'win', 'won',
]);

const NEGATIONS = new Set([
  'не', 'ні', 'нема', 'немає', 'not', 'no', 'never', "don't", "didn't", "isn't", "wasn't", "can't",
  "won't", "doesn't", "haven't", 'cannot', 'without',
]);

export type SentimentResult = {
  /** -1 (all negative) .. 1 (all positive); 0 when nothing matched. */
  score: number;
  positive: number;
  negative: number;
  /** Number of dictionary hits — how much evidence the score rests on. */
  hits: number;
};

function classify(token: string): 1 | -1 | 0 {
  if (NEGATIVE_WORDS.has(token) || NEGATIVE_STEMS.some((stem) => token.startsWith(stem))) {
    return -1;
  }
  if (POSITIVE_WORDS.has(token) || POSITIVE_STEMS.some((stem) => token.startsWith(stem))) {
    return 1;
  }
  return 0;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’`ʼ]/g, "'")
    .match(/[\p{L}']+/gu) ?? [];
}

export function analyzeSentiment(text: string | null | undefined): SentimentResult {
  if (!text) {
    return { score: 0, positive: 0, negative: 0, hits: 0 };
  }

  const tokens = tokenize(text);
  let positive = 0;
  let negative = 0;

  tokens.forEach((token, index) => {
    let polarity = classify(token);
    if (polarity === 0) {
      return;
    }
    if (index > 0 && NEGATIONS.has(tokens[index - 1])) {
      polarity = polarity === 1 ? -1 : 1;
    }
    if (polarity === 1) {
      positive += 1;
    } else {
      negative += 1;
    }
  });

  const hits = positive + negative;
  return { score: hits === 0 ? 0 : (positive - negative) / hits, positive, negative, hits };
}
