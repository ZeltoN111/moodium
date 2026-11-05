import { ImportError, entriesToCsv, entriesToJson, parseImport } from '../utils/exchange';

const source = [
  {
    date: '2026-03-20',
    mood: 4,
    intensity: 6,
    note: 'Said "hi", then left,\nlater',
    sleep_hours: 7.5,
    stress: 2,
    workload: null,
    factorKeys: ['exercise', 'social'],
    tags: ['walk'],
  },
];

describe('exchange', () => {
  it('round-trips through JSON', () => {
    const { entries, skipped } = parseImport(entriesToJson(source));
    expect(skipped).toBe(0);
    expect(entries[0]).toMatchObject({ date: '2026-03-20', mood: 4, sleepHours: 7.5, workload: null });
    expect(entries[0].factorKeys).toEqual(['exercise', 'social']);
  });

  it('escapes CSV cells', () => {
    const csv = entriesToCsv(source);
    expect(csv.split('\n')[0]).toBe('date,mood,intensity,sleep_hours,stress,workload,factors,tags,note');
    expect(csv).toContain('"Said ""hi"", then left,\nlater"');
    expect(csv).toContain('exercise;social');
  });

  it('skips invalid rows and rejects foreign files', () => {
    const text = JSON.stringify({
      entries: [
        { date: '2026-03-20', mood: 3, intensity: 5 },
        { date: 'bad', mood: 3, intensity: 5 },
        { date: '2026-03-21', mood: 9, intensity: 5 },
        { date: '2026-03-22', mood: 3, intensity: 5, stress: 77 },
      ],
    });
    const { entries, skipped } = parseImport(text);
    expect(entries).toHaveLength(1);
    expect(skipped).toBe(3);
    expect(() => parseImport('nope')).toThrow(ImportError);
    expect(() => parseImport('{"a":1}')).toThrow(ImportError);
  });
});
