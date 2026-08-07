// Ultra-Guard Security & Fire brand palette: red + black.
export const brand = {
  red: "#E2231C",
  redPressed: "#B31712",
  redMuted: "#5C1512",
  black: "#000000",
  green: "#2ECC71",
  amber: "#F5A623",
};

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  success: string;
  warning: string;
  danger: string;
  statusBar: "light" | "dark";
};

export const darkColors: ThemeColors = {
  background: "#000000",
  surface: "#141414",
  surfaceElevated: "#1F1F1F",
  border: "#2A2A2A",
  text: "#FFFFFF",
  textSecondary: "#A6A6A6",
  textOnPrimary: "#FFFFFF",
  primary: brand.red,
  primaryPressed: brand.redPressed,
  primaryMuted: brand.redMuted,
  success: brand.green,
  warning: brand.amber,
  danger: brand.red,
  statusBar: "light",
};

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  surfaceElevated: "#FFFFFF",
  border: "#E2E2E2",
  text: "#111111",
  textSecondary: "#5C5C5C",
  textOnPrimary: "#FFFFFF",
  primary: brand.red,
  primaryPressed: brand.redPressed,
  primaryMuted: "#F7D9D7",
  success: "#1E9E52",
  warning: "#B5760F",
  danger: brand.red,
  statusBar: "dark",
};
