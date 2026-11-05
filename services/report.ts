import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getAllEntries, getFactors } from '@/database/queries';
import type { Translate } from '@/i18n';
import { analyze } from '@/utils/analysis';
import { shiftDay, todayKey } from '@/utils/date';
import { buildReportHtml } from '@/utils/report';

/**
 * expo-print's web build calls window.print(), which prints the whole app page instead of the report.
 * Render the report in a hidden iframe and print that, so "Save as PDF" in the browser dialog gets the report.
 */
function printHtmlOnWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    let done = false;
    const finish = (error?: unknown) => {
      if (done) return;
      done = true;
      setTimeout(() => frame.remove(), 1000);
      error ? reject(error) : resolve();
    };
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return finish(new Error('print frame unavailable'));
      win.addEventListener('afterprint', () => finish());
      // Chrome's print dialog is modal: print() returns after it closes. Safari/Firefox may return early.
      setTimeout(() => {
        try {
          win.focus();
          win.print();
          setTimeout(() => finish(), 500);
        } catch (error) {
          finish(error);
        }
      }, 250);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

/** Builds the report from the journal and opens the system share sheet (print dialog on web). */
export async function shareReport(db: SQLiteDatabase, t: Translate, locale: string): Promise<boolean> {
  const [entries, factors] = await Promise.all([getAllEntries(db), getFactors(db)]);
  if (entries.length === 0) {
    return false;
  }

  const today = todayKey();
  const recent = entries.filter((entry) => entry.date >= shiftDay(today, -59));
  const html = buildReportHtml({
    analysis: analyze(recent, factors.map((factor) => factor.key), today),
    journal: entries,
    today,
    generatedLabel: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    t,
    locale,
  });

  if (Platform.OS === 'web') {
    await printHtmlOnWeb(html);
    return true;
  }

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  return true;
}
