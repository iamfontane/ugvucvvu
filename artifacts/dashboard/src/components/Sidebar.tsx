import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Activity, Orbit, X, Shield } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useGetDashboardStats } from "@workspace/api-client-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: stats } = useGetDashboardStats({ query: { refetchInterval: 10000 } });

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profiles", label: "Identity Fleet", icon: Users, badge: stats?.totalProfiles },
    { href: "/jobs", label: "Queue & Jobs", icon: Activity, badge: stats?.activeJobs || undefined },
    { href: "/teams", label: "Teams", icon: Shield },
  ];

  return (
    <aside className="w-64 h-screen shrink-0 border-r border-border/50 glass-panel flex flex-col z-20 relative">
      {/* Header */}
      <div className="h-16 lg:h-20 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Orbit className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <span className="font-display text-lg lg:text-xl font-bold tracking-tight text-gradient truncate">
            NovaBrowser
          </span>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-2 shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1.5">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block" onClick={onClose}>
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-5 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">System Online</span>
        </div>
      </div>
    </aside>
  );
}
