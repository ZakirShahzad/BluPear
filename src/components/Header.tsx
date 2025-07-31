import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Shield, Github, FileText, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">BluPear</span>
          </Link>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link 
                    to="/scanner" 
                    className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                      isActive('/scanner') ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background'
                    }`}
                  >
                    Scanner
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Secret Detection</h4>
                        <p className="text-sm text-muted-foreground">Find exposed API keys and credentials</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Vulnerability Audit</h4>
                        <p className="text-sm text-muted-foreground">Scan dependencies for known issues</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Code Analysis</h4>
                        <p className="text-sm text-muted-foreground">Detect insecure patterns</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">AI Recommendations</h4>
                        <p className="text-sm text-muted-foreground">Get intelligent security fixes</p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link 
                    to="/reports" 
                    className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                      isActive('/reports') ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background'
                    }`}
                  >
                    Reports
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link 
                    to="/pricing" 
                    className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                      isActive('/pricing') ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background'
                    }`}
                  >
                    Pricing
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button variant="ghost" size="sm">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Docs
          </Button>
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="cyber" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};