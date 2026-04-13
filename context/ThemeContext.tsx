import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { LightColors, DarkColors } from ".././assets/images/colors"; // adjust path

type Theme = "light" | "dark";
type ThemeColors = typeof LightColors;

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [theme, setTheme] = useState<Theme>(systemScheme === "dark" ? "dark" : "light");

  useEffect(() => {
    // optional: sync with system changes
    if (systemScheme) setTheme(systemScheme);
  }, [systemScheme]);

  const colors = theme === "light" ? LightColors : DarkColors;

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};