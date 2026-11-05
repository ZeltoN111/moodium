import { StyleSheet, View } from 'react-native';

import { BentoGrid, Screen, Tile } from '@/components/Bento';
import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import type { TKey } from '@/i18n';
import { RISK_WEIGHTS, WINDOW_DAYS } from '@/utils/burnout';
import type { RiskKey } from '@/utils/burnout';

const SIGNALS = (Object.entries(RISK_WEIGHTS) as [RiskKey, number][])
  .map(([key, weight]) => ({ key, weight: Math.round(weight * 100) }))
  .sort((a, b) => b.weight - a.weight);

export default function AboutScreen() {
  const { t } = useT();
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const palette = usePalette();

  return (
    <Screen maxWidth={860} underHeader>
      <BentoGrid>
        <Tile span={[1, 2, 3]} accent title={t('aboutTitle')}>
          <Text style={styles.intro}>{t('aboutIntro', { days: WINDOW_DAYS })}</Text>
          <View style={styles.levels}>
            {(['low', 'moderate', 'high'] as const).map((level) => (
              <View key={level} style={[styles.levelChip, { borderColor: palette.risk[level], backgroundColor: `${palette.risk[level]}1F` }]}>
                <Text style={[styles.levelLabel, { color: palette.risk[level] }]}>{t(`level_${level}` as TKey)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.caption, { color: muted }]}>{t('aboutLevels')}</Text>
        </Tile>

        {SIGNALS.map((signal) => (
          <Tile
            key={signal.key}
            title={t(`signal_${signal.key}` as TKey)}
            accessory={
              <View style={[styles.weight, { borderColor: border }]}>
                <Text style={[styles.weightLabel, { color: tint }]}>{signal.weight}%</Text>
              </View>
            }>
            <Text style={[styles.body, { color: muted }]}>{t(`about_${signal.key}` as TKey)}</Text>
          </Tile>
        ))}

        <Tile span={[1, 2, 3]}>
          <View style={styles.noteRow}>
            <Icon name="info" size={18} color={muted} />
            <Text style={[styles.caption, styles.noteText, { color: muted, flex: 1 }]}>{t('aboutMissing')}</Text>
          </View>
          <View style={styles.noteRow}>
            <Icon name="alert" size={18} color={muted} />
            <Text style={[styles.caption, styles.noteText, { color: muted, flex: 1 }]}>{t('aboutDisclaimer')}</Text>
          </View>
          <View style={styles.noteRow}>
            <Icon name="alert" size={18} color={tint} />
            <Text style={[styles.caption, styles.noteText, { color: tint, flex: 1, fontWeight: '600' }]}>{t('aboutCrisis')}</Text>
          </View>
        </Tile>
      </BentoGrid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 23 },
  levels: { flexDirection: 'row', gap: 8, marginTop: 16 },
  levelChip: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  levelLabel: { fontSize: 12, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  body: { fontSize: 14, lineHeight: 20 },
  weight: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  weightLabel: { fontFamily: FONTS.mono, fontSize: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  noteText: { marginTop: 0 },
});
