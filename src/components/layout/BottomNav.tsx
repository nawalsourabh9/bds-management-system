import { Home, CheckSquare, FileText, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const linkBase =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-vms-xs font-medium text-muted-foreground transition-colors";

export function BottomNav() {
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md md:hidden"
      aria-label="Primary mobile"
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(linkBase, isActive && "text-primary")
        }
      >
        <Home className="h-5 w-5" />
        <span>Home</span>
      </NavLink>
      <NavLink
        to="/tasks"
        className={({ isActive }) =>
          cn(linkBase, isActive && "text-primary")
        }
      >
        <CheckSquare className="h-5 w-5" />
        <span>Tasks</span>
      </NavLink>
      <NavLink
        to="/documents"
        className={({ isActive }) =>
          cn(linkBase, isActive && "text-primary")
        }
      >
        <FileText className="h-5 w-5" />
        <span>Docs</span>
      </NavLink>
      <button
        type="button"
        className={cn(linkBase, "border-0 bg-transparent")}
        onClick={() => {
          if (isMobile) setOpenMobile(true);
        }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
