import { FileText, Search, LogOut, History } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Resume Analyser', url: '/dashboard/resume-analyser', icon: FileText },
  { title: 'PDF Search', url: '/dashboard/pdf-search', icon: Search },
  { title: 'History', url: '/dashboard/history', icon: History}
];

export function AppSidebar() {
  const { signOut, user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-out text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 active-scale border-l-2 border-transparent"
                      activeClassName="bg-sidebar-accent !text-primary font-semibold shadow-sm !border-l-2 !border-primary rounded-l-none"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
