import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { colors } from './colors';
import { spacing } from './spacing';
import { fonts, textStyles } from './typography';

const shape = {
  radius: {
    card: 20,
    chip: 999,
    segmentShell: 18,
    segment: 14,
    button: 14,
  },
} as const;

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  fonts: typeof fonts;
  text: typeof textStyles;
  shape: typeof shape;
  isDark: boolean;
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const theme = useMemo<Theme>(
    () => ({
      colors,
      spacing,
      fonts,
      text: textStyles,
      shape,
      isDark,
    }),
    [isDark]
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDark,
      toggleTheme,
    }),
    [theme, isDark, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextType {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error('useThemeContext must be used inside ThemeProvider');
  }

  return ctx;
}

