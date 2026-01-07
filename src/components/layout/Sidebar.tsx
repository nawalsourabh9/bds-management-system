
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
  Map,
  GitBranch,
  Workflow,
  Brain,
  Calendar as CalendarIcon,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const allMenuItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/",
    adminOnly: false
  },
  {
    title: "Tasks",
    icon: ClipboardList,
    path: "/tasks",
    adminOnly: false
  },
  {
    title: "Calendar",
    icon: CalendarIcon,
    path: "/calendar",
    adminOnly: false
  },
  {
    title: "Users",
    icon: Users,
    path: "/users",
    managerOrAdminOnly: true
  },
  {
    title: "Departments",
    icon: Building2,
    path: "/departments",
    managerOrAdminOnly: true
  },
  {
    title: "Positions",
    icon: Building2,
    path: "/positions",
    managerOrAdminOnly: true
  },
  {
    title: "Department Summary",
    icon: BarChart3,
    path: "/department-summary",
    adminOnly: false
  }
];

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  // Get user role for filtering
  const employee = user as any;
  const userRole = employee?.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin' || userRole === 'superadmin';

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.managerOrAdminOnly) return isManagerOrAdmin;
    return true;
  });
  
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

        <SidebarGroup>
          <SidebarGroupLabel>Visual Guides</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/mind-map/organization" 
                    className={`flex items-center ${location.pathname === '/mind-map/organization' ? 'font-medium text-primary' : ''}`}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Organization Chart</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/mind-map/departments" 
                    className={`flex items-center ${location.pathname === '/mind-map/departments' ? 'font-medium text-primary' : ''}`}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Department Structure</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/mind-map/tasks" 
                    className={`flex items-center ${location.pathname === '/mind-map/tasks' ? 'font-medium text-primary' : ''}`}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Task Workflow</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/mind-map/processes" 
                    className={`flex items-center ${location.pathname === '/mind-map/processes' ? 'font-medium text-primary' : ''}`}
                  >
                    <Workflow className="mr-2 h-4 w-4" />
                    <span>Process Maps</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </ShadcnSidebar>
  );
}
