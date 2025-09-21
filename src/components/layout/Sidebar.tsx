
import { 
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";

import { 
  Home, 
  ClipboardList,
  Users,
  Building2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/"
  },
  {
    title: "Tasks",
    icon: ClipboardList,
    path: "/tasks"
  },
  {
    title: "Users",
    icon: Users,
    path: "/users"
  },
  {
    title: "Departments",
    icon: Building2,
    path: "/departments"
  },
  {
    title: "Positions",
    icon: Building2,
    path: "/positions"
  }
];

export function AppSidebar() {
  const location = useLocation();
  
  return (
    <ShadcnSidebar>
      <SidebarContent>
        <div className="px-3 py-4">
          <h2 className="text-lg font-semibold text-eqms-blue">BDS Manufacturing</h2>
          <p className="text-xs text-muted-foreground">IATF Compliant Quality Management System</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.path} 
                      className={`flex items-center ${location.pathname === item.path ? 'font-medium text-primary' : ''}`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </ShadcnSidebar>
  );
}
