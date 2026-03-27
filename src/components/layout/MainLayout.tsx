import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="app-container flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="content-layout flex-1 bg-background px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6 lg:px-10">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
