
import { useState } from "react";
import { useTheme } from "next-themes";
import { Bell, Search, LogOut, Settings, HelpCircle, UserRound, RefreshCw, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications.tsx";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { useAuth } from "@/hooks/use-auth";
import { EmployeeData } from "@/types/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { unreadCount, fetchNotifications } = useNotifications();
  const { signOut, user } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = () => {
    if (!user) return "U";
    
    // Try to get first_name and last_name first (from backend)
    const userAny = user as any;
    if (userAny.first_name) {
      const firstInitial = userAny.first_name[0]?.toUpperCase() || "";
      const lastInitial = userAny.last_name?.[0]?.toUpperCase() || "";
      if (firstInitial && lastInitial) {
        return firstInitial + lastInitial;
      }
      if (firstInitial) {
        return firstInitial;
      }
    }
    
    // Fallback to name field (EmployeeData)
    const name = (user as EmployeeData).name || "";
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] || "") + (nameParts[1][0] || "");
    }
    return name.substring(0, 1).toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    if (!user) return "My Account";
    
    // Try to get first_name and last_name first (from backend)
    const userAny = user as any;
    if (userAny.first_name) {
      const firstName = userAny.first_name || "";
      const lastName = userAny.last_name || "";
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
      if (firstName) {
        return firstName;
      }
    }
    
    // Fallback to name field (EmployeeData)
    const name = (user as EmployeeData).name || "";
    return name || "My Account";
  };
  
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-20 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="vms-interactive" />
          <h2 className="hidden truncate text-vms-xl font-semibold text-foreground md:block">
            BDS Manufacturing
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                variant="vms"
                placeholder="Search..."
                className="w-[300px] pl-11 md:w-[400px] lg:w-[500px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="vms-interactive relative shrink-0 border-border"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label="Toggle color theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:inline" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative border-border hover:bg-accent">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 bg-background border-border max-h-[500px]">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Badge variant="secondary">
                      {unreadCount} new
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNotifications()}
                    className="h-6 w-6 p-0"
                    title="Refresh notifications"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <NotificationsList />
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-accent">
                <Avatar variant="vms" className="h-10 w-10">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {user ? ((user as any).role || 'User').charAt(0).toUpperCase() + ((user as any).role || 'user').slice(1) : 'BDS Manufacturing'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center hover:bg-accent"
                onClick={() => navigate("/profile")}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center hover:bg-accent"
                onClick={() => navigate("/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center hover:bg-accent"
                onClick={() => navigate("/help")}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center hover:bg-accent text-red-500"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
