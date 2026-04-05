import { useThemeContext } from './ThemeProvider';

export function useTheme() {
  const { theme } = useThemeContext();
  return theme;
}
