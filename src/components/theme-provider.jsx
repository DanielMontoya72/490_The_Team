import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark", "theme-colorful", "colorblind"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}