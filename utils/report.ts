import type { Translate, TKey } from '../i18n';
import type { Analysis } from './analysis';
import { WINDOW_DAYS } from './burnout';
import { adviceText, describeSignal, factorSentence, forecastText, statusFor } from './describe';
import { dayNumber, formatDayLabel } from './date';

export type ReportJournalEntry = {
  date: string;
  mood: number;
  note: string | null;
  sleep_hours: number | null;
  stress: number | null;
  workload: number | null;
  tags: string[];
};

const LEVEL_COLORS = { low: '#2f9e44', moderate: '#d98a1c', high: '#d93d42' } as const;
const STATUS_COLORS = { ok: '#2f9e44', watch: '#d98a1c', high: '#d93d42' } as const;
const ACCENT = '#5b5bd6';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const e = escapeHtml;
const dash = '—';

/** Inline SVG polyline of mood (1–5) across the last `days` days; no external assets, so it prints anywhere. */
function moodChartSvg(entries: ReportJournalEntry[], today: string, days: number): string {
  const width = 680;
  const height = 150;
  const pad = { left: 26, right: 8, top: 10, bottom: 18 };
  const end = dayNumber(today);
  const start = end - days + 1;
  const x = (day: number) => pad.left + ((day - start) / Math.max(1, days - 1)) * (width - pad.left - pad.right);
  const y = (mood: number) => pad.top + ((5 - mood) / 4) * (height - pad.top - pad.bottom);

  const points = entries
    .map((entry) => ({ day: dayNumber(entry.date), mood: entry.mood }))
    .filter((point) => point.day >= start && point.day <= end)
    .sort((a, b) => a.day - b.day);

  const grid = [1, 2, 3, 4, 5]
    .map(
      (mood) =>
        `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y(mood)}" y2="${y(mood)}" stroke="#e5e7ee" stroke-dasharray="3 4"/>` +
        `<text x="${pad.left - 8}" y="${y(mood) + 4}" font-size="10" fill="#8a8fa3" text-anchor="end">${mood}</text>`
    )
    .join('');
  const line = points.length > 1
    ? `<polyline fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linejoin="round" points="${points
        .map((p) => `${x(p.day).toFixed(1)},${y(p.mood).toFixed(1)}`)
        .join(' ')}"/>`
    : '';
  const dots = points
    .map((p) => `<circle cx="${x(p.day).toFixed(1)}" cy="${y(p.mood).toFixed(1)}" r="3.5" fill="${ACCENT}"/>`)
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img">${grid}${line}${dots}</svg>`;
}

type ReportInput = {
  analysis: Analysis;
  journal: ReportJournalEntry[];
  today: string;
  /** Date to print as "generated on". */
  generatedLabel: string;
  t: Translate;
  locale: string;
  journalDays?: number;
};

/** A self-contained, print-ready HTML document summarising the user's index, patterns and journal. */
export function buildReportHtml({
  analysis,
  journal,
  today,
  generatedLabel,
  t,
  locale,
  journalDays = 30,
}: ReportInput): string {
  const { burnout } = analysis;
  const ok = burnout.status === 'ok';
  const levelColor = LEVEL_COLORS[burnout.level];
  const level = t(`level_${burnout.level}` as TKey);

  const section = (title: string, body: string) =>
    `<section><h2>${e(title)}</h2>${body}</section>`;

  const indexBlock = ok
    ? `<div class="index"><div class="score" style="color:${levelColor}">${burnout.score}<span>/ 100</span></div>
       <div><div class="level" style="background:${levelColor}22;color:${levelColor}">${e(level)}</div>
       <p class="muted">${e(t('insightsWindow', { days: WINDOW_DAYS, count: burnout.entryCount }))}</p></div></div>
       ${burnout.reasons.length ? `<ul>${burnout.reasons.map((r) => `<li>${e(t(`reason_${r.key}` as TKey, r.params))}</li>`).join('')}</ul>` : `<p>${e(t('allGood'))}</p>`}`
    : `<p>${e(t('reportNeedData'))}</p>`;

  const adviceBlock = analysis.advice.length
    ? `<ol>${analysis.advice.map((item) => `<li>${e(adviceText(item, t))}</li>`).join('')}</ol>`
    : '';

  const signalsRows = ok
    ? [...burnout.components]
        .sort((a, b) => Number(b.available) - Number(a.available) || b.points - a.points)
        .map((c) => {
          const status = statusFor(c.risk);
          return `<tr><td>${e(t(`signal_${c.key}` as TKey))}</td>
            <td>${c.available ? e(describeSignal(c, t)) : `<span class="muted">${e(t('signalNoData'))}</span>`}</td>
            <td>${c.available ? `<span style="color:${STATUS_COLORS[status]};font-weight:700">${e(t(`status_${status}` as TKey))}</span>` : dash}</td>
            <td class="num">${c.available ? `${Math.round(c.points)} / ${Math.round(c.maxPoints)}` : dash}</td></tr>`;
        })
        .join('')
    : '';
  const signalsBlock = ok
    ? `<table><thead><tr><th></th><th></th><th></th><th class="num">${e(t('reportColPoints'))}</th></tr></thead><tbody>${signalsRows}</tbody></table>`
    : '';

  const { forecast } = analysis;
  const forecastBlock =
    ok && forecast
      ? `<p>${e(forecastText(forecast, burnout.score, t))}</p>
         <div class="chips">${forecast.projected
           .map(
             (p) =>
               `<div class="chip"><div class="muted">${e(
                 t(p.offset === 1 ? 'forecastTomorrow' : p.offset === 3 ? 'forecastIn3' : 'forecastIn7')
               )}</div><b>~${p.score}</b></div>`
           )
           .join('')}</div>
         <p class="muted small">${e(t('forecastNote', { n: forecast.basedOn }))}</p>`
      : '';

  const { recap } = analysis;
  const signed = (value: number | null, digits = 1) =>
    value === null ? '' : ` (${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)})`;
  const recapBlock =
    recap.daysLogged > 0
      ? `<div class="chips">
          <div class="chip"><div class="muted">${e(t('recapMood'))}</div><b>${recap.avgMood!.toFixed(1)}${e(signed(recap.moodDelta))}</b></div>
          <div class="chip"><div class="muted">${e(t('recapDays'))}</div><b>${e(t('recapDaysOf', { count: recap.daysLogged }))}</b></div>
          <div class="chip"><div class="muted">${e(t('recapSleep'))}</div><b>${recap.avgSleep === null ? dash : e(t('hoursShort', { hours: recap.avgSleep.toFixed(1) })) + e(signed(recap.sleepDelta))}</b></div>
          ${ok && analysis.indexWeekAgo !== null ? `<div class="chip"><div class="muted">${e(t('recapIndex'))}</div><b>${burnout.score}${e(signed(burnout.score - analysis.indexWeekAgo, 0))}</b></div>` : ''}
        </div>
        <p class="small">${recap.best ? `${e(t('recapBest'))}: <b>${e(formatDayLabel(recap.best.date, locale))}</b> (${e(t(`mood${recap.best.mood}` as TKey))})` : ''}
        ${recap.worst ? ` · ${e(t('recapWorst'))}: <b>${e(formatDayLabel(recap.worst.date, locale))}</b> (${e(t(`mood${recap.worst.mood}` as TKey))})` : ''}</p>`
      : `<p class="muted">${e(t('recapEmpty'))}</p>`;

  const factorsBlock = analysis.impacts.length
    ? `<ul>${analysis.impacts
        .map((impact) => `<li>${e(factorSentence(impact, t))} <span class="muted">(${e(t('factorDays', { withCount: impact.withCount, withoutCount: impact.withoutCount }))})</span></li>`)
        .join('')}</ul>`
    : '';

  const recentJournal = journal
    .filter((entry) => dayNumber(entry.date) > dayNumber(today) - journalDays)
    .sort((a, b) => b.date.localeCompare(a.date));
  const journalRows = recentJournal
    .map(
      (entry) => `<tr><td>${e(formatDayLabel(entry.date, locale))}</td>
        <td>${e(t(`mood${entry.mood}` as TKey))}</td>
        <td class="num">${entry.sleep_hours === null ? dash : entry.sleep_hours}</td>
        <td class="num">${entry.stress ?? dash}</td>
        <td class="num">${entry.workload ?? dash}</td>
        <td>${entry.note ? e(entry.note) : ''}${entry.tags.length ? ` <span class="muted">${e(entry.tags.map((tag) => `#${tag}`).join(' '))}</span>` : ''}</td></tr>`
    )
    .join('');
  const journalBlock = recentJournal.length
    ? `<table class="journal"><thead><tr><th>${e(t('reportColDate'))}</th><th>${e(t('sectionMood'))}</th><th class="num">${e(t('sectionSleep'))}</th><th class="num">${e(t('sectionStress'))}</th><th class="num">${e(t('sectionWorkload'))}</th><th>${e(t('sectionNote'))}</th></tr></thead><tbody>${journalRows}</tbody></table>`
    : `<p class="muted">${e(t('reportNoEntries'))}</p>`;

  return `<!doctype html>
<html lang="${e(locale.slice(0, 2))}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${e(t('reportTitle'))}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#15161c;margin:0;padding:28px;font-size:13px;line-height:1.5}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${ACCENT};padding-bottom:10px;margin-bottom:6px}
  h1{margin:0;font-size:24px} h2{font-size:15px;margin:22px 0 8px;color:${ACCENT};text-transform:uppercase;letter-spacing:.04em}
  .muted{color:#6b7083} .small{font-size:12px} .num{text-align:right;white-space:nowrap}
  section{break-inside:avoid} .index{display:flex;align-items:center;gap:18px}
  .score{font-size:56px;font-weight:800;line-height:1} .score span{font-size:16px;color:#6b7083;margin-left:4px;font-weight:600}
  .level{display:inline-block;padding:4px 12px;border-radius:10px;font-weight:700}
  ul,ol{margin:6px 0 0;padding-left:20px} li{margin:3px 0}
  table{width:100%;border-collapse:collapse} th,td{padding:6px 8px;border-bottom:1px solid #e5e7ee;text-align:left;vertical-align:top}
  th{font-size:11px;color:#6b7083;text-transform:uppercase} th.num,td.num{text-align:right}
  .journal td{font-size:12px} tr{break-inside:avoid}
  .chips{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0} .chip{border:1px solid #e5e7ee;border-radius:12px;padding:8px 14px;background:#f6f7fb} .chip b{font-size:16px}
  footer{margin-top:26px;padding-top:10px;border-top:1px solid #e5e7ee;font-size:11px;color:#6b7083}
</style></head><body>
<header><div><h1>${e(t('reportTitle'))}</h1><div class="muted">${e(t('reportGenerated', { date: generatedLabel }))}</div></div><div class="muted">${e(formatDayLabel(today, locale))}</div></header>
${section(t('insightsTitle'), indexBlock)}
${adviceBlock ? section(t('adviceTitle'), adviceBlock) : ''}
${signalsBlock ? section(t('signalsTitle'), signalsBlock) : ''}
${forecastBlock ? section(t('forecastTitle'), forecastBlock) : ''}
${section(t('recapTitle'), recapBlock)}
${factorsBlock ? section(t('factorImpact'), factorsBlock) : ''}
${section(t('reportMoodChart', { days: journalDays }), moodChartSvg(journal, today, journalDays))}
${section(t('reportJournal', { days: journalDays }), journalBlock)}
<footer>${e(t('aboutDisclaimer'))}</footer>
</body></html>`;
}
