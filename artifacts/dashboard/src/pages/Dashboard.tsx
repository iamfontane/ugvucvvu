import { motion } from "framer-motion";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Activity, CheckCircle2, AlertCircle, Users, Server, Zap, AlertTriangle, MessageSquare, Camera, Twitter, Youtube } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LiveLog } from "@/components/LiveLog";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function StatCard({ title, value, icon: Icon, colorClass, gradientClass, warn }: {
  title: string; value: number; icon: React.ElementType;
  colorClass: string; gradientClass: string; warn?: boolean;
}) {
  return (
    <motion.div variants={itemVariants} className="relative group">
      <div className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl", gradientClass)} />
      <div className={cn("relative h-full glass-panel p-4 sm:p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300", warn && value > 0 && "border-warning/30")}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <h3 className={cn("text-3xl sm:text-4xl font-display font-bold mt-1.5", warn && value > 0 ? "text-warning" : "text-foreground")}>{value}</h3>
          </div>
          <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-background/50 border border-white/5 shrink-0", colorClass)}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  discord: { icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  instagram: { icon: Camera, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  twitter: { icon: Twitter, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  youtube: { icon: Youtube, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats({ query: { refetchInterval: 10000 } });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Synchronizing telemetry...</p>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full text-center border-destructive/20">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">Telemetry Disconnected</h2>
          <p className="mt-2 text-sm text-muted-foreground">Make sure the API server is running.</p>
        </div>
      </div>
    );
  }

  const platformStats = (stats as any).platformStats as Record<string, number> | undefined;
  const needsAttention = (stats as any).needsAttention as number ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">System Overview</h1>
        <p className="mt-1.5 text-sm sm:text-base lg:text-lg text-muted-foreground">Real-time telemetry and profile fleet status.</p>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 mb-6 sm:mb-10">
        <StatCard title="Total" value={stats.totalProfiles} icon={Users} colorClass="text-blue-400" gradientClass="bg-blue-500" />
        <StatCard title="Idle Ready" value={stats.idleProfiles} icon={CheckCircle2} colorClass="text-emerald-400" gradientClass="bg-emerald-500" />
        <StatCard title="Active" value={stats.busyProfiles} icon={Activity} colorClass="text-amber-400" gradientClass="bg-amber-500" />
        <StatCard title="Errors" value={stats.errorProfiles} icon={AlertCircle} colorClass="text-rose-400" gradientClass="bg-rose-500" />
        <StatCard title="⚠ Attention" value={needsAttention} icon={AlertTriangle} colorClass="text-warning" gradientClass="bg-yellow-500" warn />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-6 sm:mb-10">
        <LiveLog />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Queue Analytics */}
        <div className="lg:col-span-2 glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-bold flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Zap className="w-5 h-5 text-primary shrink-0" />
            Queue Analytics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Pending", value: stats.pendingJobs || 0, cls: "bg-muted/30 border-border/50", textCls: "text-foreground", labelCls: "text-muted-foreground" },
              { label: "Active", value: stats.activeJobs || 0, cls: "bg-primary/10 border-primary/20", textCls: "text-primary", labelCls: "text-primary" },
              { label: "Completed", value: stats.completedJobs || 0, cls: "bg-success/10 border-success/20", textCls: "text-success", labelCls: "text-success" },
              { label: "Failed", value: stats.failedJobs || 0, cls: "bg-destructive/10 border-destructive/20", textCls: "text-destructive", labelCls: "text-destructive" },
            ].map(({ label, value, cls, textCls, labelCls }) => (
              <div key={label} className={cn("p-3 sm:p-4 rounded-xl border", cls)}>
                <p className={cn("text-xs sm:text-sm font-medium mb-1", labelCls)}>{label}</p>
                <p className={cn("text-2xl sm:text-3xl font-bold", textCls)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Platform breakdown */}
          {platformStats && Object.keys(platformStats).length > 0 && (
            <div className="mt-5 sm:mt-6 pt-5 border-t border-border/50">
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platform Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformStats).map(([platform, count]) => {
                  const meta = PLATFORM_META[platform];
                  const Icon = meta?.icon;
                  return (
                    <div key={platform} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold", meta?.bg ?? "bg-muted/30 border-border/50")}>
                      {Icon && <Icon className={cn("w-3.5 h-3.5", meta?.color)} />}
                      <span className="capitalize text-foreground">{platform}</span>
                      <span className={cn("font-bold", meta?.color)}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Worker node */}
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-row lg:flex-col items-center justify-center gap-4 lg:gap-0 lg:text-center">
          <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-muted/30 flex items-center justify-center lg:mb-6 relative shrink-0">
            <Server className={cn("w-8 h-8 lg:w-10 lg:h-10", stats.queueAvailable ? "text-success" : "text-destructive")} />
            {stats.queueAvailable && <div className="absolute inset-0 rounded-full border-2 border-success animate-ping" />}
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-foreground">Worker Node</h3>
            <p className={cn("mt-1.5 font-medium px-3 py-1 rounded-full text-xs sm:text-sm inline-block", stats.queueAvailable ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
              {stats.queueAvailable ? "Connected & Ready" : "Disconnected (Check Redis)"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
