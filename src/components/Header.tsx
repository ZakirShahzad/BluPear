import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Shield, Github, FileText, Settings } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">BluPear</span>
          </div>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                  Scanner
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
                <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                  Reports
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Docs
          </Button>
          <Button variant="cyber" size="sm">
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
};