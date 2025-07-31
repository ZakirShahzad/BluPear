import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 p-0 relative overflow-hidden group"
    >
      <Sun className={`h-4 w-4 transition-all duration-300 ${
        theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
      }`} />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 ${
        theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
      }`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};