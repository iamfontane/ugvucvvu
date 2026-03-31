import { useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { Play, Crosshair, BoxSelect, Clock, AlertTriangle, Database, Layers, CheckCircle2, XCircle, MessageSquare, Camera, Twitter, Youtube, LogIn } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useListJobs, useStartBrowserJob, useListProfiles,
  useListJobHistory, useBatchLogin,
  getListJobsQueryKey, getGetDashboardStatsQueryKey, getListJobHistoryQueryKey,
} from "@workspace/api-client-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  discord: MessageSquare, instagram: Camera, twitter: Twitter, youtube: Youtube,
};
const ERROR_TYPE_COLORS: Record<string, string> = {
  network: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  timeout: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  invalid_credentials: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  captcha: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  banned: "text-red-500 bg-red-500/10 border-red-500/20",
  unknown: "text-muted-foreground bg-muted/50 border-border/50",
};

type TabType = "dispatch" | "history";

export default function Jobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("dispatch");
  const [targetUrl, setTargetUrl] = useState("");
  const [profileId, setProfileId] = useState("");
  const [batchPlatform, setBatchPlatform] = useState("discord");
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  const { data: jobs, isLoading: isJobsLoading, isError: isJobsError } = useListJobs({ query: { refetchInterval: 5000, retry: 0 } });
  const { data: profiles } = useListProfiles();
  const { data: history, isLoading: isHistoryLoading } = useListJobHistory(
    { limit: 100 },
    { query: { refetchInterval: 10000, enabled: activeTab === "history" } }
  );

  const startJobMut = useStartBrowserJob({ mutation: { onSuccess: () => { toast({ title: "Job dispatched" }); setTargetUrl(""); setProfileId(""); queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }); }, onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }) } });

  const batchLoginMut = useBatchLogin({ mutation: { onSuccess: (data: any) => { toast({ title: `${data.queued} login jobs queued` }); setIsBatchOpen(false); queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }); }, onError: (err: any) => toast({ title: "Batch failed", description: err.message, variant: "destructive" }) } });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); startJobMut.mutate({ data: { url: targetUrl, profileId: profileId || undefined } }); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">Queue & Execution</h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">Dispatch tasks and monitor execution pipeline.</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 glass-panel rounded-xl w-fit">
        {([["dispatch", Layers, "Queue"], ["history", Database, "Job History"]] as const).map(([tab, Icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as TabType)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === tab ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === "dispatch" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Dispatch form */}
          <div className="glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-display font-bold flex items-center gap-2 text-foreground">
                <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />Quick Dispatch
              </h2>
              <button onClick={() => setIsBatchOpen(!isBatchOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors text-xs font-semibold border border-indigo-500/20">
                <LogIn className="w-3.5 h-3.5" />Batch Login
              </button>
            </div>

            {isBatchOpen && (
              <div className="mb-5 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <p className="text-xs font-semibold text-indigo-400 mb-3">Queue login jobs for all idle profiles on a platform</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={batchPlatform} onChange={e => setBatchPlatform(e.target.value)}
                    className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none">
                    {["discord","instagram","twitter","youtube"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <button onClick={() => batchLoginMut.mutate({ data: { platform: batchPlatform, delayBetweenMs: 8000 } })}
                    disabled={batchLoginMut.isPending}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 disabled:opacity-50 transition-all text-sm">
                    <LogIn className="w-4 h-4" />{batchLoginMut.isPending ? "Queuing..." : "Queue Batch"}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative z-10">
              <input required type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                placeholder="Target URL (e.g. https://target.com)" />
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={profileId} onChange={e => setProfileId(e.target.value)}
                  className="flex-1 bg-input border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none cursor-pointer">
                  <option value="">Any Idle Profile (Auto-select)</option>
                  {profiles?.map(p => <option key={p.id} value={p.id}>{p.email ? `${p.email} (${p.id.substring(0,6)})` : `ID: ${p.id.substring(0,8)}`}</option>)}
                </select>
                <button type="submit" disabled={startJobMut.isPending}
                  className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-50 transition-all text-sm whitespace-nowrap">
                  <Play className="w-4 h-4 fill-current" />{startJobMut.isPending ? "Dispatching..." : "Dispatch"}
                </button>
              </div>
            </form>
          </div>

          {/* Live queue */}
          <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-muted/50 border-b border-border/50 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  <th className="p-4 lg:p-5">Job</th><th className="p-4 lg:p-5">URL</th><th className="p-4 lg:p-5">State</th><th className="p-4 lg:p-5 hidden lg:table-cell">Timeline</th><th className="p-4 lg:p-5 hidden md:table-cell">Error</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {isJobsLoading ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />Loading...</td></tr>
                    : !jobs?.length ? <tr><td colSpan={5} className="p-10 text-center"><BoxSelect className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="font-medium text-foreground">Pipeline Empty</p></td></tr>
                    : jobs?.map((job) => (
                      <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 lg:p-5"><p className="font-mono text-sm font-medium text-foreground">{job.id?.substring(0, 8)}</p><p className="text-xs text-muted-foreground mt-0.5 font-mono">P: {job.profileId.substring(0, 8)}</p></td>
                        <td className="p-4 lg:p-5"><span className="truncate font-medium text-foreground text-sm block max-w-[200px]" title={job.url ?? ""}>{job.url ?? "—"}</span></td>
                        <td className="p-4 lg:p-5"><StatusBadge status={job.state} /></td>
                        <td className="p-4 lg:p-5 text-sm hidden lg:table-cell"><p className="text-foreground">{format(new Date(job.createdAt), "HH:mm:ss")}</p>{job.finishedAt && <p className="text-xs text-muted-foreground">Fin: {format(new Date(job.finishedAt), "HH:mm:ss")}</p>}</td>
                        <td className="p-4 lg:p-5 hidden md:table-cell">{job.error ? <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20 line-clamp-1 max-w-[180px] inline-block">{job.error}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile queue cards */}
          <div className="sm:hidden space-y-3">
            {isJobsLoading ? <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />Loading...</div>
              : !jobs?.length ? <div className="glass-panel rounded-2xl p-8 text-center"><BoxSelect className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="font-medium text-foreground">Pipeline Empty</p></div>
              : jobs?.map((job) => (
                <div key={job.id} className="glass-panel rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-mono text-sm font-medium">{job.id?.substring(0, 8)}…</p><p className="text-xs text-muted-foreground font-mono">P: {job.profileId.substring(0, 8)}</p></div>
                    <StatusBadge status={job.state} />
                  </div>
                  <p className="mt-2 text-sm truncate" title={job.url ?? ""}>{job.url ?? "—"}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{format(new Date(job.createdAt), "HH:mm:ss")}</div>
                  {job.error && <p className="mt-2 text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded border border-destructive/20 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" />{job.error}</p>}
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {activeTab === "history" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden">
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-muted/50 border-b border-border/50 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                <th className="p-4 lg:p-5">Job / Profile</th><th className="p-4 lg:p-5">Type</th><th className="p-4 lg:p-5">Platform</th><th className="p-4 lg:p-5">State</th><th className="p-4 lg:p-5 hidden md:table-cell">Duration</th><th className="p-4 lg:p-5">Diagnostics</th><th className="p-4 lg:p-5 hidden lg:table-cell">Time</th>
              </tr></thead>
              <tbody className="divide-y divide-border/30">
                {isHistoryLoading ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />Loading history...</td></tr>
                  : !history?.length ? <tr><td colSpan={7} className="p-10 text-center"><Database className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="font-medium text-foreground">No job history yet</p><p className="text-sm text-muted-foreground">History appears once jobs run.</p></td></tr>
                  : history?.map((rec) => {
                    const errorCls = rec.errorType ? (ERROR_TYPE_COLORS[rec.errorType] ?? ERROR_TYPE_COLORS.unknown) : "";
                    const PlatformIcon = rec.platform ? PLATFORM_ICONS[rec.platform] : null;
                    return (
                      <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 lg:p-5"><p className="font-mono text-sm font-medium text-foreground">{rec.id.substring(0, 8)}</p><p className="text-xs text-muted-foreground mt-0.5 font-mono">P: {rec.profileId.substring(0, 8)}</p></td>
                        <td className="p-4 lg:p-5"><span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-border/50 text-foreground">{rec.jobType}</span></td>
                        <td className="p-4 lg:p-5">{PlatformIcon ? <span className="inline-flex items-center gap-1 text-xs capitalize text-muted-foreground"><PlatformIcon className="w-3.5 h-3.5" />{rec.platform}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                        <td className="p-4 lg:p-5">{rec.state === "completed" ? <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20"><CheckCircle2 className="w-3 h-3" />Done</span> : rec.state === "failed" ? <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20"><XCircle className="w-3 h-3" />Failed</span> : <StatusBadge status={rec.state} />}</td>
                        <td className="p-4 lg:p-5 text-sm text-muted-foreground hidden md:table-cell">{rec.durationMs ? `${(rec.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                        <td className="p-4 lg:p-5">{rec.errorType ? <span className={cn("text-xs px-2 py-1 rounded border inline-block max-w-[200px] truncate", errorCls)} title={rec.errorMessage ?? ""}>{rec.errorType}: {rec.errorMessage?.substring(0, 40)}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                        <td className="p-4 lg:p-5 text-xs text-muted-foreground hidden lg:table-cell">{formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Mobile history cards */}
          <div className="sm:hidden divide-y divide-border/30">
            {isHistoryLoading ? <div className="p-8 text-center text-muted-foreground"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />Loading...</div>
              : !history?.length ? <div className="p-8 text-center"><Database className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="font-medium text-foreground">No history yet</p></div>
              : history?.map((rec) => {
                const PlatformIcon = rec.platform ? PLATFORM_ICONS[rec.platform] : null;
                const errorCls = rec.errorType ? (ERROR_TYPE_COLORS[rec.errorType] ?? ERROR_TYPE_COLORS.unknown) : "";
                return (
                  <div key={rec.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-mono text-sm font-medium">{rec.id.substring(0, 8)}…</p><p className="text-xs text-muted-foreground font-mono mt-0.5">{rec.jobType}{PlatformIcon && <> · <PlatformIcon className="w-3 h-3 inline mx-0.5" />{rec.platform}</>}</p></div>
                      {rec.state === "completed" ? <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20"><CheckCircle2 className="w-3 h-3" />Done</span>
                        : rec.state === "failed" ? <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20"><XCircle className="w-3 h-3" />Failed</span>
                        : <StatusBadge status={rec.state} />}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}</span>
                      {rec.durationMs && <span><Clock className="w-3 h-3 inline mr-0.5" />{(rec.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                    {rec.errorType && <p className={cn("mt-2 text-xs px-2.5 py-1.5 rounded border flex items-center gap-1.5", errorCls)}><AlertTriangle className="w-3 h-3 shrink-0" />{rec.errorType}: {rec.errorMessage?.substring(0, 60)}</p>}
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
