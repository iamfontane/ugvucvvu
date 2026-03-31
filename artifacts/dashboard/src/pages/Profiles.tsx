import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus, Play, ShieldCheck, Trash2, Power, Terminal, Mail, Globe,
  LogIn, AlertTriangle, Tag, MessageSquare, Camera, Twitter, Youtube,
  Copy, Cookie, Fingerprint, RefreshCw, CheckSquare, Square,
  MoreHorizontal, X, Upload, Download, ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import {
  useListProfiles, getListProfilesQueryKey,
  useCreateProfile, useStartProfileJob, useWarmupProfile,
  useTriggerHealthCheck, useDeleteProfile, useLoginProfile,
  useCloneProfile, useBulkDeleteProfiles,
  useRegenerateFingerprint, useImportCookies, useExportCookies,
  useListTemplates,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const INPUT = "w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";
const LABEL = "text-sm font-medium text-foreground block mb-1.5";

const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  discord:   { label: "Discord",   icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
  instagram: { label: "Instagram", icon: Camera,        color: "text-pink-400",   bg: "bg-pink-500/15 border-pink-500/30"   },
  twitter:   { label: "Twitter",   icon: Twitter,       color: "text-sky-400",    bg: "bg-sky-500/15 border-sky-500/30"     },
  youtube:   { label: "YouTube",   icon: Youtube,       color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30"     },
};

function PlatformBadge({ platform }: { platform?: string | null }) {
  if (!platform) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = PLATFORM_META[platform];
  const Icon = meta?.icon ?? Globe;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold capitalize", meta?.bg ?? "bg-muted/30 border-border/50")}>
      <Icon className={cn("w-3 h-3", meta?.color)} />
      <span className={meta?.color}>{meta?.label ?? platform}</span>
    </span>
  );
}

function TagList({ tags }: { tags?: string[] | null }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border/50">
          <Tag className="w-2.5 h-2.5" />{t}
        </span>
      ))}
    </div>
  );
}

function FingerprintModal({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const regenMut = useRegenerateFingerprint({
    mutation: {
      onSuccess: () => {
        toast({ title: "Fingerprint regenerated" });
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        onClose();
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  const { data: profiles } = useListProfiles();
  const profile = profiles?.find(p => p.id === profileId);
  const fp = (profile as any)?.fingerprint as Record<string, unknown> | null;

  return (
    <Modal isOpen onClose={onClose} title="Browser Fingerprint" description="Anti-detect identity for this profile">
      <div className="space-y-4">
        {fp ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["OS", `${fp.os} ${fp.osVersion}`],
              ["Browser", `${fp.browser} ${fp.browserVersion}`],
              ["Screen", `${fp.screenWidth}×${fp.screenHeight} @${fp.pixelRatio}x`],
              ["CPU Cores", fp.cpuCores],
              ["Memory", `${fp.deviceMemory} GB`],
              ["Timezone", fp.timezone],
              ["Language", fp.language],
              ["WebGL Vendor", fp.webglVendor],
              ["WebRTC", fp.webrtcPolicy],
              ["Touch Points", fp.touchPoints],
              ["Connection", `${fp.connectionType} ${fp.connectionDownlink}Mbps`],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-muted/40 rounded-lg p-2.5 border border-border/30">
                <div className="text-muted-foreground font-medium mb-0.5">{label as string}</div>
                <div className="text-foreground font-mono truncate">{String(value)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-xl p-4 text-center text-sm text-muted-foreground">
            No fingerprint stored yet — will be generated on next launch.
          </div>
        )}
        <div className="flex justify-between gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Close</button>
          <button
            onClick={() => regenMut.mutate({ id: profileId, data: {} })}
            disabled={regenMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", regenMut.isPending && "animate-spin")} />
            {regenMut.isPending ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CookieImportModal({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = useImportCookies({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: `Imported ${data.count ?? 0} cookies` });
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        onClose();
      },
      onError: (err: any) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRaw(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      const cookies = JSON.parse(raw);
      if (!Array.isArray(cookies)) throw new Error("Expected an array of cookies");
      importMut.mutate({ id: profileId, data: { cookies } });
    } catch (err) {
      toast({ title: "Invalid JSON", description: "Must be an array of cookie objects", variant: "destructive" });
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Import Cookies" description="Paste JSON or upload a Netscape/JSON cookie file">
      <div className="space-y-4">
        <input ref={fileRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Upload className="w-4 h-4" /> Upload cookie file
        </button>
        <div className="text-center text-xs text-muted-foreground">or paste JSON</div>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          className="w-full h-36 bg-input border border-border rounded-xl px-4 py-3 text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          placeholder='[{"name":"sessionid","value":"abc123","domain":".example.com",...}]'
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Cancel</button>
          <button onClick={handleImport} disabled={!raw.trim() || importMut.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm">
            <Cookie className="w-3.5 h-3.5" />{importMut.isPending ? "Importing…" : "Import Cookies"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Profiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading } = useListProfiles({ query: { refetchInterval: 10000 } });
  const { data: templates } = useListTemplates();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStartJobOpen, setIsStartJobOpen] = useState(false);
  const [fpProfileId, setFpProfileId] = useState<string | null>(null);
  const [cookieProfileId, setCookieProfileId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [platform, setPlatform] = useState("");
  const [proxy, setProxy] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState("random");
  const [targetUrl, setTargetUrl] = useState("");

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const resetCreate = () => {
    setName(""); setEmail(""); setPassword(""); setPlatform(""); setProxy("");
    setTags(""); setNotes(""); setTemplateId("random");
  };

  const createMut = useCreateProfile({
    mutation: {
      onSuccess: () => { toast({ title: "Profile deployed" }); setIsCreateOpen(false); resetCreate(); invalidateData(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });
  const deleteMut = useDeleteProfile({ mutation: { onSuccess: () => { toast({ title: "Profile deleted" }); invalidateData(); } } });
  const cloneMut = useCloneProfile({ mutation: { onSuccess: () => { toast({ title: "Profile cloned" }); invalidateData(); }, onError: (err: any) => toast({ title: "Clone failed", description: err.message, variant: "destructive" }) } });
  const bulkDeleteMut = useBulkDeleteProfiles({
    mutation: {
      onSuccess: (data: any) => { toast({ title: `Deleted ${data.deleted} profiles` }); setSelectedIds(new Set()); invalidateData(); },
      onError: (err: any) => toast({ title: "Bulk delete failed", description: err.message, variant: "destructive" }),
    },
  });
  const warmupMut = useWarmupProfile({ mutation: { onSuccess: () => toast({ title: "Warmup queued" }), onError: (err: any) => toast({ title: "Warmup failed", description: err.message, variant: "destructive" }) } });
  const healthMut = useTriggerHealthCheck({ mutation: { onSuccess: () => toast({ title: "Health check queued" }) } });
  const startJobMut = useStartProfileJob({
    mutation: {
      onSuccess: () => { toast({ title: "Job started" }); setIsStartJobOpen(false); setTargetUrl(""); invalidateData(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });
  const loginMut = useLoginProfile({
    mutation: {
      onSuccess: (data: any) => { toast({ title: `${data.platform ?? "Login"} job queued` }); invalidateData(); },
      onError: (err: any) => toast({ title: "Login failed", description: err.message, variant: "destructive" }),
    },
  });

  const { refetch: doExport } = useExportCookies(cookieProfileId ?? "skip", {
    query: { enabled: false },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      data: {
        name: name || undefined,
        email: email || undefined,
        password: password || undefined,
        platform: platform as any || undefined,
        proxy: proxy || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        notes: notes || undefined,
        templateId: templateId || undefined,
      },
    });
  };

  const handleStartJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;
    startJobMut.mutate({ id: selectedProfileId, data: { url: targetUrl } });
  };

  const openStartJob = (id: string) => { setSelectedProfileId(id); setIsStartJobOpen(true); setOpenMenuId(null); };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === profiles?.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(profiles?.map(p => p.id)));
  };

  const handleExportCookies = async (id: string) => {
    setCookieProfileId(id);
    const result = await doExport();
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data.cookies, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `cookies-${id.substring(0, 8)}.json`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${result.data.count} cookies` });
    }
    setCookieProfileId(null);
  };

  const allSelected = !!profiles?.length && selectedIds.size === profiles.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">Identity Fleet</h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">Manage browser profiles, fingerprints, and sessions.</p>
        </motion.div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => bulkDeleteMut.mutate({ data: { ids: [...selectedIds] } })}
                disabled={bulkDeleteMut.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-white font-semibold text-sm hover:bg-destructive/90 disabled:opacity-50 shadow-lg shadow-destructive/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedIds.size}
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all text-sm sm:text-base">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />Deploy Profile
          </motion.button>
        </div>
      </div>

      {/* Desktop table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                <th className="p-4 lg:p-5 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-4 lg:p-5">Name / ID</th>
                <th className="p-4 lg:p-5">Platform</th>
                <th className="p-4 lg:p-5 hidden md:table-cell">Fingerprint</th>
                <th className="p-4 lg:p-5">Status</th>
                <th className="p-4 lg:p-5 hidden lg:table-cell">Tags</th>
                <th className="p-4 lg:p-5 hidden lg:table-cell">Last Active</th>
                <th className="p-4 lg:p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
                  Loading fleet data...
                </td></tr>
              ) : profiles?.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center">
                  <Terminal className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-medium text-foreground">No profiles deployed</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "Deploy Profile" to get started</p>
                </td></tr>
              ) : (
                profiles?.map((profile) => {
                  const fp = (profile as any).fingerprint as Record<string, unknown> | null;
                  const isSelected = selectedIds.has(profile.id);
                  return (
                    <tr key={profile.id} className={cn(
                      "hover:bg-white/[0.02] transition-colors group",
                      (profile as any).needsAttention && "bg-warning/[0.03]",
                      isSelected && "bg-primary/5",
                    )}>
                      <td className="p-4 lg:p-5 w-10">
                        <button onClick={() => toggleSelect(profile.id)} className="text-muted-foreground hover:text-primary transition-colors">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-4 lg:p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border/50 shrink-0 relative">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            {(profile as any).needsAttention && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full border border-background" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {(profile as any).name || <span className="font-mono text-xs text-muted-foreground">{profile.id.substring(0, 8)}…</span>}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{profile.email || "No email"}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 lg:p-5"><PlatformBadge platform={profile.platform} /></td>
                      <td className="p-4 lg:p-5 hidden md:table-cell">
                        {fp ? (
                          <button onClick={() => setFpProfileId(profile.id)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                            <Fingerprint className="w-3 h-3" />
                            {String(fp.os ?? "?")}/{String(fp.browser ?? "?")}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 lg:p-5"><StatusBadge status={profile.status} /></td>
                      <td className="p-4 lg:p-5 hidden lg:table-cell max-w-[180px]">
                        <TagList tags={profile.tags as string[]} />
                      </td>
                      <td className="p-4 lg:p-5 text-sm text-muted-foreground hidden lg:table-cell">
                        {profile.lastUsed ? format(new Date(profile.lastUsed), "MMM d, HH:mm") : "Never"}
                      </td>
                      <td className="p-4 lg:p-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {profile.platform && (
                            <button onClick={() => loginMut.mutate({ id: profile.id })} title={`Login ${profile.platform}`} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors">
                              <LogIn className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => openStartJob(profile.id)} title="Browse URL" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => warmupMut.mutate({ id: profile.id })} title="Warmup" className="p-2 rounded-lg bg-warning/10 text-warning hover:bg-warning hover:text-white transition-colors">
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => healthMut.mutate({ id: profile.id })} title="Health Check" className="p-2 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setFpProfileId(profile.id)} title="Fingerprint" className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors">
                            <Fingerprint className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => cloneMut.mutate({ id: profile.id })} title="Clone" className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setCookieProfileId(profile.id)} title="Import Cookies" className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-colors">
                            <Cookie className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleExportCookies(profile.id)} title="Export Cookies" className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMut.mutate({ id: profile.id })} title="Delete" className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Mobile cards */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
            Loading...
          </div>
        ) : profiles?.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <Terminal className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">No profiles deployed</p>
          </div>
        ) : (
          profiles?.map((profile) => {
            const fp = (profile as any).fingerprint as Record<string, unknown> | null;
            const isSelected = selectedIds.has(profile.id);
            return (
              <div key={profile.id} className={cn(
                "glass-panel rounded-2xl p-4",
                (profile as any).needsAttention && "border-warning/30",
                isSelected && "border-primary/30 bg-primary/5",
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => toggleSelect(profile.id)} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {(profile as any).name || <span className="font-mono text-xs">{profile.id.substring(0, 8)}…</span>}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{profile.email || "No email"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={profile.status} />
                    <button onClick={() => setOpenMenuId(openMenuId === profile.id ? null : profile.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <PlatformBadge platform={profile.platform} />
                  {fp && (
                    <button onClick={() => setFpProfileId(profile.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium">
                      <Fingerprint className="w-3 h-3" />{String(fp.os)}/{String(fp.browser)}
                    </button>
                  )}
                </div>
                <div className="mt-1.5"><TagList tags={profile.tags as string[]} /></div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last: {profile.lastUsed ? format(new Date(profile.lastUsed), "MMM d, HH:mm") : "Never"}
                </p>
                {openMenuId === profile.id && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-5 gap-2">
                    {profile.platform && <button onClick={() => { loginMut.mutate({ id: profile.id }); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-medium"><LogIn className="w-4 h-4" />Login</button>}
                    <button onClick={() => { openStartJob(profile.id); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary/10 text-primary text-xs font-medium"><Play className="w-4 h-4" />Run</button>
                    <button onClick={() => { warmupMut.mutate({ id: profile.id }); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-warning/10 text-warning text-xs font-medium"><Power className="w-4 h-4" />Warm</button>
                    <button onClick={() => { setFpProfileId(profile.id); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs font-medium"><Fingerprint className="w-4 h-4" />FP</button>
                    <button onClick={() => { cloneMut.mutate({ id: profile.id }); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs font-medium"><Copy className="w-4 h-4" />Clone</button>
                    <button onClick={() => { setCookieProfileId(profile.id); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-medium"><Upload className="w-4 h-4" />Import</button>
                    <button onClick={() => { handleExportCookies(profile.id); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-500/10 text-green-400 text-xs font-medium"><Download className="w-4 h-4" />Export</button>
                    <button onClick={() => { deleteMut.mutate({ id: profile.id }); setOpenMenuId(null); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium"><Trash2 className="w-4 h-4" />Del</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </motion.div>

      {/* Fingerprint modal */}
      {fpProfileId && <FingerprintModal profileId={fpProfileId} onClose={() => setFpProfileId(null)} />}

      {/* Cookie import modal */}
      {cookieProfileId && <CookieImportModal profileId={cookieProfileId} onClose={() => setCookieProfileId(null)} />}

      {/* Create profile modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetCreate(); }} title="Deploy New Profile" description="Configure a new browser identity with fingerprint.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Profile Name <span className="text-muted-foreground font-normal text-xs">Optional</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="My Discord Account" />
            </div>
            <div>
              <label className={LABEL}>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={cn(INPUT, "appearance-none")}>
                <option value="">Select platform...</option>
                <option value="discord">Discord</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter / X</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Email / Username</label>
              <input value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="account@example.com" />
            </div>
            <div>
              <label className={LABEL}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={INPUT} placeholder="••••••••" />
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className={LABEL}>Fingerprint Template</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(templates ?? []).map((tpl: any) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all",
                    templateId === tpl.id
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <span className="truncate">{tpl.name.replace(" / ", "/")} </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={cn(LABEL, "flex items-center justify-between")}>
              Proxy <span className="text-xs text-muted-foreground font-normal">Optional — auto-assigned if empty</span>
            </label>
            <input value={proxy} onChange={e => setProxy(e.target.value)} className={cn(INPUT, "font-mono")} placeholder="http://user:pass@ip:port" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={cn(LABEL, "flex items-center justify-between")}>
                Tags <span className="text-xs text-muted-foreground font-normal">Comma-separated</span>
              </label>
              <input value={tags} onChange={e => setTags(e.target.value)} className={INPUT} placeholder="campaign-a, warmed" />
            </div>
            <div>
              <label className={LABEL}>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className={INPUT} placeholder="Optional notes..." />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetCreate(); }} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={createMut.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm">
              {createMut.isPending ? "Deploying..." : "Deploy Profile"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Start job modal */}
      <Modal isOpen={isStartJobOpen} onClose={() => setIsStartJobOpen(false)} title="Browse URL" description={`Run on profile ${selectedProfileId?.substring(0, 8)}`}>
        <form onSubmit={handleStartJob} className="space-y-4">
          <div>
            <label className={LABEL}>Target URL</label>
            <input required type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} className={INPUT} placeholder="https://example.com" />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsStartJobOpen(false)} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={startJobMut.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm">
              <Play className="w-3.5 h-3.5" />{startJobMut.isPending ? "Starting..." : "Start"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
