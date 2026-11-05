import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import BarRow from '@/components/BarRow';
import FactorCard from '@/components/FactorCard';
import ForecastCard from '@/components/ForecastCard';
import RecapCard from '@/components/RecapCard';
import SignalRow from '@/components/SignalRow';
import { BentoGrid, IconButton, Screen, Tile } from '@/components/Bento';
import BurnoutGauge from '@/components/BurnoutGauge';
import Icon from '@/components/Icon';
import TrendChart from '@/components/TrendChart';
import { MOODS, moodLabel } from '@/components/MoodPicker';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { useSettings } from '@/context/Settings';
import { shareReport } from '@/services/report';
import { getAnalyticsEntries, getFactors } from '@/database/queries';
import type { TKey } from '@/i18n';
import { MIN_ENTRIES, WINDOW_DAYS } from '@/utils/burnout';
import { formatDayLabel, formatNumber, shiftDay, todayKey } from '@/utils/date';
import { adviceText } from '@/utils/describe';
import { analyze } from '@/utils/analysis';
import type { Analysis } from '@/utils/analysis';

/** How far back the factor/tag/distribution statistics look. */
const STATS_DAYS = 60;

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, locale } = useSettings();
  const [sharing, setSharing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const palette = usePalette();
  const RISK_COLORS = palette.risk;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const today = todayKey();
        const [entries, factors] = await Promise.all([
          getAnalyticsEntries(db, shiftDay(today, -(STATS_DAYS - 1)), today),
          getFactors(db),
        ]);
        if (!cancelled) {
          setAnalysis(
            analyze(
              entries,
              factors.map((factor) => factor.key),
              today
            )
          );
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      if (!(await shareReport(db, t, locale))) {
        Alert.alert(t('exportEmpty'));
      }
    } catch {
      Alert.alert(t('reportFailed'));
    } finally {
      setSharing(false);
    }
  }

  if (!analysis) {
    return <View style={styles.flex} />;
  }

  const { burnout } = analysis;
  const level = burnout.level;
  const ok = burnout.status === 'ok';

  const seriesPoints = analysis.series.filter((point) => point.score !== null);
  const labelStep = Math.ceil(analysis.series.length / 6);

  return (
    <Screen
      glow={ok ? RISK_COLORS[level] : tint}
      glowSecondary={tint}
      eyebrow={ok ? t('insightsWindow', { days: WINDOW_DAYS, count: burnout.entryCount }) : t('insightsTitle')}
      title={t('tabInsights')}
      actions={
        <>
          <IconButton icon="info" label={t('howItWorks')} onPress={() => router.push('/about')} />
          <IconButton icon="download" label={t('shareReport')} onPress={handleShare} disabled={sharing} />
        </>
      }>
      <BentoGrid>
        <Tile bare span={[1, 1, 1]}>
          {ok ? (
            <BurnoutGauge score={burnout.score} level={level} label={t(`level_${level}` as TKey)} />
          ) : (
            <View style={[styles.emptyBox, { borderColor: border }]}>
              <Text style={[LABEL, { color: muted }]}>{t('insightsTitle')}</Text>
              <Text style={styles.emptyTitle}>
                {t('needMoreData', { min: MIN_ENTRIES, days: WINDOW_DAYS })}
              </Text>
              <Text style={[styles.meta, { color: muted }]}>
                {t('needMoreDataCount', { count: burnout.entryCount })}
              </Text>
              <Text style={[styles.meta, { color: muted }]}>{t('loadDemoHint')}</Text>
            </View>
          )}
        </Tile>

        {ok && (
          <Tile
            span={[1, 1, 2]}
            title={t('whyTitle')}>
            {burnout.reasons.length === 0 ? (
              <View style={styles.reasonRow}>
                <Icon name="check-circle" size={20} color={RISK_COLORS.low} />
                <Text style={styles.reason}>{t('allGood')}</Text>
              </View>
            ) : (
              burnout.reasons.map((reason) => (
                <View key={reason.key} style={styles.reasonRow}>
                  <Icon name="alert" size={20} color={RISK_COLORS.moderate} />
                  <Text style={styles.reason}>{t(`reason_${reason.key}` as TKey, reason.params)}</Text>
                </View>
              ))
            )}
            {analysis.advice.length > 0 && (
              <View style={[styles.advice, { borderTopColor: border }]}>
                <Text style={[LABEL, { color: muted }]}>{t('adviceTitle')}</Text>
                {analysis.advice.map((item, index) => (
                  <View key={item.id} style={[styles.step, index > 0 && { borderTopColor: border, borderTopWidth: 1, paddingTop: 14 }]}>
                    <Text style={[styles.stepNumber, { color: tint }]}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.stepText}>{adviceText(item, t)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Tile>
        )}

        <Tile
          span={[1, 2, 2]}
          title={t('recapTitle')}
          subtitle={t('recapRange', {
            from: formatDayLabel(analysis.recap.from, locale),
            to: formatDayLabel(analysis.recap.to, locale),
          })}>
          <RecapCard
            recap={analysis.recap}
            index={ok ? { now: burnout.score, weekAgo: analysis.indexWeekAgo } : null}
            t={t}
            locale={locale}
          />
        </Tile>

        {ok && (
          <Tile title={t('forecastTitle')} subtitle={t('forecastSubtitle')}>
            <ForecastCard forecast={analysis.forecast} score={burnout.score} t={t} />
          </Tile>
        )}

        {ok && (
          <Tile
            span={[1, 2, 3]}
            title={t('signalsTitle')}
            subtitle={`${t('signalsHint', { score: burnout.score })} ${t('signalsLegend')}`}>
            <View style={styles.cards}>
              {[...burnout.components]
                .sort((x, y) => Number(y.available) - Number(x.available) || y.points - x.points)
                .map((component, index) => (
                  <View key={component.key} style={styles.cardCell}>
                    <SignalRow component={component} t={t} locale={locale} index={index} />
                  </View>
                ))}
            </View>
            <View style={[styles.total, { borderTopColor: border }]}>
              <Text style={[LABEL, { color: muted }]}>{t('totalLabel')}</Text>
              <Text style={[styles.totalValue, { color: RISK_COLORS[level] }]}>{burnout.score} / 100</Text>
            </View>
          </Tile>
        )}

        {seriesPoints.length >= 2 && (
          <Tile span={[1, 2, 2]} title={t('indexTrend')}>
            <TrendChart
              gradientId="index-trend"
              values={analysis.series.map((point) => point.score)}
              min={0}
              max={100}
              levels={[100, 60, 35, 0]}
              color={RISK_COLORS[level]}
              height={180}
              xLabels={analysis.series.map((point, index) => (index % labelStep === 0 ? point.date.slice(8) : ''))}
              pointLabels={analysis.series.map((point) => formatDayLabel(point.date, locale))}
            />
          </Tile>
        )}

        <Tile span={[1, 1, 1]} title={t('streak', { count: analysis.streak })} icon="flame" iconColor={RISK_COLORS.moderate}>
          {analysis.correlation !== null ? (
            <>
              <BarRow
                label={t('sleepCorrelation')}
                fraction={Math.abs(analysis.correlation)}
                color={analysis.correlation < 0 ? RISK_COLORS.high : tint}
                valueLabel={formatNumber(analysis.correlation, 2, locale)}
              />
              <Text style={[styles.fact, { color: muted }]}>{t(correlationKey(analysis.correlation))}</Text>
            </>
          ) : (
            <Text style={[styles.fact, { color: muted }]}>{t('corr_weak')}</Text>
          )}
        </Tile>

        <Tile span={[1, 2, 3]} title={t('factorImpact')} subtitle={t('factorImpactHint')}>
          {analysis.impacts.length === 0 ? (
            <Text style={{ color: muted }}>{t('factorNeedData')}</Text>
          ) : (
            <View style={styles.cards}>
              {analysis.impacts.map((impact) => (
                <View key={impact.key} style={styles.cardCell}>
                  <FactorCard impact={impact} t={t} locale={locale} />
                </View>
              ))}
            </View>
          )}
        </Tile>

        <Tile title={t('moodDistribution')}>
          {MOODS.map((mood) => (
            <BarRow
              key={mood.value}
              label={moodLabel(t, mood.value)}
              fraction={analysis.total ? analysis.distribution[mood.value - 1] / analysis.total : 0}
              color={palette.mood(mood.value)}
              valueLabel={String(analysis.distribution[mood.value - 1])}
            />
          ))}
        </Tile>

        {analysis.tags.length > 0 && (
          <Tile title={t('tagsTitle')} subtitle={t('tagsHint')}>
            {analysis.tags.slice(0, 6).map((tag) => (
              <BarRow
                key={tag.name}
                label={`#${tag.name} · ${tag.count}`}
                fraction={tag.avgMood / 5}
                color={tag.avgMood >= 3.5 ? RISK_COLORS.low : tag.avgMood >= 2.5 ? RISK_COLORS.moderate : RISK_COLORS.high}
                valueLabel={formatNumber(tag.avgMood, 1, locale)}
              />
            ))}
          </Tile>
        )}
      </BentoGrid>
    </Screen>
  );
}

function correlationKey(value: number): TKey {
  if (value < -0.3) return 'corr_negative';
  if (value >= 0.6) return 'corr_strong';
  if (value >= 0.3) return 'corr_moderate';
  return 'corr_weak';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyBox: { gap: 10, borderWidth: 1, borderRadius: 24, padding: 18 },
  emptyTitle: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 19 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  reason: { flex: 1, fontSize: 14, lineHeight: 20 },
  fact: { flex: 1, fontSize: 13, lineHeight: 19 },
  // Cards wrap by available width: one per row on phones, two or three on laptops.
  cards: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 18 },
  cardCell: { flexGrow: 1, flexBasis: 300 },
  advice: { borderTopWidth: 1, paddingTop: 16, marginTop: 4, gap: 14 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepNumber: { fontFamily: FONTS.displayRegular, fontSize: 14, lineHeight: 22 },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22 },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 14, marginTop: 18 },
  totalValue: { fontFamily: FONTS.mono, fontSize: 13 },
});
