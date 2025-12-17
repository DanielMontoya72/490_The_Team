import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import theLogo from "@/assets/the-logo.png";

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "Login", path: "/login" },
  { label: "Register", path: "/register" },
];

export function PublicNav() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = ({ mobile = false }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => mobile && setIsOpen(false)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            isActive(item.path)
              ? "bg-primary text-primary-foreground font-semibold"
              : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
          )}
        >
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 py-3 flex items-center relative">
        {/* Logo/Title - Far Left */}
        <div className="flex-shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={theLogo} 
              alt="The Team Logo" 
              className="h-8 md:h-10 w-auto transition-transform group-hover:scale-105"
              width="32"
              height="32"
              loading="eager"
              decoding="sync"
              style={{ 
                maxWidth: '32px', 
                maxHeight: '32px',
                objectFit: 'contain'
              }}
            />
            <span className="text-sm md:text-base font-semibold text-muted-foreground hidden sm:inline">
              ATS Platform
            </span>
          </Link>
        </div>

        {/* Desktop Navigation - Absolutely Centered */}
        <div className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2">
            <NavLinks />
          </div>
        </div>

        {/* Mobile spacer */}
        <div className="flex-1 md:hidden"></div>

        {/* Mobile Navigation - Far Right */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks mobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}