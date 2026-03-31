import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Shield, Trash2, UserPlus, Building2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import {
  useListTeams, useCreateTeam, useDeleteTeam,
  useListUsers, useCreateUser,
} from "@workspace/api-client-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const INPUT = "w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";
const LABEL = "text-sm font-medium text-foreground block mb-1.5";

const ROLE_COLORS: Record<string, string> = {
  admin:  "bg-red-500/15 text-red-400 border-red-500/30",
  owner:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  member: "bg-primary/15 text-primary border-primary/30",
  viewer: "bg-muted text-muted-foreground border-border/50",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-md border text-xs font-semibold capitalize", ROLE_COLORS[role] ?? ROLE_COLORS.viewer)}>
      {role}
    </span>
  );
}

export default function Teams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teams, isLoading: teamsLoading } = useListTeams({ query: { refetchInterval: 30000 } });
  const { data: users, isLoading: usersLoading } = useListUsers({ query: { refetchInterval: 30000 } });

  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("member");
  const [userTeamId, setUserTeamId] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries();
  };

  const createTeamMut = useCreateTeam({
    mutation: {
      onSuccess: () => { toast({ title: "Team created" }); setIsTeamOpen(false); setTeamName(""); setTeamDesc(""); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  const deleteTeamMut = useDeleteTeam({
    mutation: {
      onSuccess: () => { toast({ title: "Team deleted" }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  const createUserMut = useCreateUser({
    mutation: {
      onSuccess: () => { toast({ title: "User added" }); setIsUserOpen(false); setUserName(""); setUserEmail(""); setUserRole("member"); setUserTeamId(""); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">Team Collaboration</h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">Manage teams and user access.</p>
        </motion.div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => setIsUserOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
            <UserPlus className="w-4 h-4" />Add User
          </button>
          <button onClick={() => setIsTeamOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all text-sm">
            <Plus className="w-4 h-4" />New Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Teams */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Teams</h2>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">{teams?.length ?? 0}</span>
          </div>
          <div className="glass-panel rounded-2xl overflow-hidden">
            {teamsLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : teams?.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium text-foreground">No teams yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create a team to organize profiles</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {teams?.map((team: any) => (
                  <div key={team.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{team.name}</p>
                        {team.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{team.description}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">Created {format(new Date(team.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{users?.filter((u: any) => u.teamId === team.id).length ?? 0} members</span>
                      <button onClick={() => deleteTeamMut.mutate({ id: team.id })} className="p-2 rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Users */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Users</h2>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">{users?.length ?? 0}</span>
          </div>
          <div className="glass-panel rounded-2xl overflow-hidden">
            {usersLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : users?.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium text-foreground">No users yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add users to assign profile ownership</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {users?.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm">{user.name}</p>
                          <RoleBadge role={user.role} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                        {user.teamId && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {teams?.find((t: any) => t.id === user.teamId)?.name ?? "Unknown team"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", user.isActive ? "bg-success" : "bg-muted-foreground/30")} title={user.isActive ? "Active" : "Inactive"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={isTeamOpen} onClose={() => setIsTeamOpen(false)} title="Create Team" description="Organize profiles and users into a team.">
        <form onSubmit={e => { e.preventDefault(); createTeamMut.mutate({ data: { name: teamName, description: teamDesc || undefined } }); }} className="space-y-4">
          <div>
            <label className={LABEL}>Team Name <span className="text-destructive">*</span></label>
            <input required value={teamName} onChange={e => setTeamName(e.target.value)} className={INPUT} placeholder="Marketing Team" />
          </div>
          <div>
            <label className={LABEL}>Description <span className="text-muted-foreground font-normal text-xs">Optional</span></label>
            <input value={teamDesc} onChange={e => setTeamDesc(e.target.value)} className={INPUT} placeholder="Handles social media automation" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsTeamOpen(false)} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={createTeamMut.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm">
              {createTeamMut.isPending ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isUserOpen} onClose={() => setIsUserOpen(false)} title="Add User" description="Add a user to the system.">
        <form onSubmit={e => { e.preventDefault(); createUserMut.mutate({ data: { name: userName, email: userEmail, role: userRole, teamId: userTeamId || undefined } }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Name <span className="text-destructive">*</span></label>
              <input required value={userName} onChange={e => setUserName(e.target.value)} className={INPUT} placeholder="Jane Smith" />
            </div>
            <div>
              <label className={LABEL}>Email <span className="text-destructive">*</span></label>
              <input required type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className={INPUT} placeholder="jane@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Role</label>
              <select value={userRole} onChange={e => setUserRole(e.target.value)} className={cn(INPUT, "appearance-none")}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Team <span className="text-muted-foreground font-normal text-xs">Optional</span></label>
              <select value={userTeamId} onChange={e => setUserTeamId(e.target.value)} className={cn(INPUT, "appearance-none")}>
                <option value="">No team</option>
                {teams?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsUserOpen(false)} className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={createUserMut.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 text-sm">
              {createUserMut.isPending ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
