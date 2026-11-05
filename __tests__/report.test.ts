import { createTranslator } from '../i18n';
import { analyze } from '../utils/analysis';
import type { AnalysisEntry } from '../utils/analysis';
import { shiftDay } from '../utils/date';
import { generateDemoEntries } from '../utils/demo';
import { buildReportHtml, escapeHtml } from '../utils/report';

const TODAY = '2026-03-20';

const demo: AnalysisEntry[] = generateDemoEntries(TODAY, 'en').map((e) => ({
  date: e.date,
  mood: e.mood,
  intensity: e.intensity,
  note: e.note,
  sleep_hours: e.sleepHours,
  stress: e.stress,
  workload: e.workload,
  factorKeys: e.factorKeys,
  tags: e.tags,
}));
const FACTORS = ['work', 'sleep', 'exercise', 'social'];

function html(language: 'en' | 'uk', entries = demo) {
  return buildReportHtml({
    analysis: analyze(entries, FACTORS, TODAY),
    journal: entries,
    today: TODAY,
    generatedLabel: '20 March 2026',
    t: createTranslator(language),
    locale: language === 'uk' ? 'uk-UA' : 'en-US',
  });
}

describe('buildReportHtml', () => {
  it('contains the index, its explanation, next steps and the journal', () => {
    const doc = html('en');
    const analysis = analyze(demo, FACTORS, TODAY);
    expect(doc).toContain('Moodium report');
    expect(doc).toContain(`>${analysis.burnout.score}<span>`);
    expect(doc).toContain('Next steps');
    expect(doc).toContain('What makes up the score');
    expect(doc).toContain('Forecast');
    expect(doc).toContain('<svg');
    expect(doc.startsWith('<!doctype html>')).toBe(true);
  });

  it('is localised', () => {
    const doc = html('uk');
    expect(doc).toContain('Звіт Moodium');
    expect(doc).toContain('Наступні кроки');
    expect(doc).not.toMatch(/\{\w+\}/); // no unfilled placeholders
  });

  it('escapes user text so notes cannot inject markup', () => {
    const evil = demo.map((e, i) => (i === demo.length - 1 ? { ...e, note: '<script>alert(1)</script> & "x"' } : e));
    const doc = html('en', evil);
    expect(doc).not.toContain('<script>');
    expect(doc).toContain('&lt;script&gt;');
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('degrades gracefully with no data', () => {
    const doc = html('en', []);
    expect(doc).toContain('Not enough entries to calculate the index yet.');
    expect(doc).toContain('No entries yet.');
  });

  it('only lists journal days inside the window', () => {
    const old = { ...demo[0], date: shiftDay(TODAY, -45), note: 'ancient note' };
    expect(html('en', [...demo, old])).not.toContain('ancient note');
  });
});
