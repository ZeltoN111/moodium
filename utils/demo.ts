import { shiftDay } from './date';
import type { ExchangeEntry } from './exchange';

export type DemoLanguage = 'uk' | 'en';

const NOTES = {
  uk: {
    good: [
      'Класний день, була енергія й гарний настрій.',
      'Добре попрацював і ввечері відпочив із друзями.',
      'Вдалий день, відчуваю спокій і задоволення.',
      'Ранкова пробіжка дала купу енергії.',
    ],
    neutral: ['Звичайний день, нічого особливого.', 'Багато справ, але все під контролем.'],
    bad: [
      'Дуже втомився, дедлайн душить, майже не спав.',
      'Постійний стрес і тривога, ніяк не можу розслабитись.',
      'Виснажений, байдуже до всього, нічого не хочеться.',
      'Паніка перед здачею, безсоння, все валиться.',
      'Перевантаження на роботі, злюсь на всіх, дуже погано.',
    ],
  },
  en: {
    good: [
      'Great day, lots of energy and a good mood.',
      'Productive work and a relaxing evening with friends.',
      'Felt calm and happy, really enjoyed it.',
      'Morning run gave me so much energy.',
    ],
    neutral: ['Ordinary day, nothing special.', 'Busy but everything is under control.'],
    bad: [
      'So tired, the deadline is crushing me and I barely slept.',
      'Constant stress and anxiety, cannot relax at all.',
      'Exhausted and numb, nothing feels worth doing.',
      'Panic before the exam, insomnia, everything is falling apart.',
      'Overwhelmed at work, angry at everyone, awful day.',
    ],
  },
};

const TAGS = { calm: ['walk', 'friends', 'coffee', 'music'], tense: ['deadline', 'exam', 'overtime'] };

/** Small deterministic PRNG so demo data (and tests) are reproducible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A believable month: two relaxed weeks followed by a slide into burnout (less sleep, more
 * stress, darker notes). A few days are skipped, but never the most recent three.
 */
export function generateDemoEntries(
  today: string,
  language: DemoLanguage = 'en',
  days = 30,
  seed = 7
): ExchangeEntry[] {
  const random = mulberry32(seed);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const jitter = (amount: number) => (random() * 2 - 1) * amount;
  const entries: ExchangeEntry[] = [];

  for (let i = 0; i < days; i += 1) {
    const fromEnd = days - 1 - i;
    if (fromEnd >= 3 && random() < 0.1) {
      continue;
    }

    const progress = i / (days - 1);
    const strain = clamp((progress - 0.5) * 2, 0, 1);

    const mood = Math.round(clamp(4.3 - 2.9 * strain + jitter(0.8), 1, 5));
    const sleepHours = Math.round(clamp(7.8 - 3.1 * strain + jitter(0.6), 3.5, 10) * 2) / 2;
    const stress = Math.round(clamp(1.8 + 3.1 * strain + jitter(0.7), 1, 5));
    const workload = Math.round(clamp(2.2 + 2.8 * strain + jitter(0.7), 1, 5));

    const factorKeys: string[] = [];
    if (random() < 0.6 - 0.55 * strain) factorKeys.push('exercise');
    if (random() < 0.55 - 0.45 * strain) factorKeys.push('social');
    if (random() < 0.5 + 0.45 * strain) factorKeys.push('work');
    if (random() < 0.4) factorKeys.push('sleep');

    const notes = NOTES[language];
    const note =
      random() < 0.7 ? pick(mood >= 4 ? notes.good : mood <= 2 ? notes.bad : notes.neutral) : null;

    entries.push({
      date: shiftDay(today, -fromEnd),
      mood,
      intensity: Math.round(clamp(4 + random() * 5, 1, 10)),
      note,
      sleepHours,
      stress,
      workload,
      factorKeys,
      tags: random() < 0.5 ? [pick(mood >= 3 ? TAGS.calm : TAGS.tense)] : [],
    });
  }

  return entries;
}
