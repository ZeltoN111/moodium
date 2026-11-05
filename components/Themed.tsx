/**
 * Themed primitives. Text defaults to the Onest body family and maps fontWeight onto the
 * matching font file (custom fonts ignore fontWeight on Android); styles that name their own
 * fontFamily (display, mono) are left alone.
 */
import { StyleSheet, Text as DefaultText, View as DefaultView } from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors from '@/constants/Colors';
import { bodyFamily } from '@/constants/Fonts';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const flat = StyleSheet.flatten(style) ?? {};
  const font = flat.fontFamily ? null : { fontFamily: bodyFamily(flat.fontWeight), fontWeight: 'normal' as const };

  return <DefaultText style={[{ color }, style, font]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
