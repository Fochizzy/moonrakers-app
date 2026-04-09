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

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  fonts: typeof fonts;
  text: typeof textStyles;
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

