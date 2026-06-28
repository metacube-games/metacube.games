import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RefreshCw, Trash2, Ban, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { StatCard } from "@/components/library/stat-card";
import { Searchbox } from "@/components/library/searchbox";
import { DataTable, type Column } from "@/components/library/data-table";
import { FormField } from "@/components/library/form-field";
import { ConfirmDialog } from "@/components/library/confirm-dialog";
import { EmptyState } from "@/components/library/empty-state";
import { Spinner } from "@/components/library/spinner";

const BACKEND_URL = import.meta.env.VITE_REACT_APP_CONTROLLER_BACKEND_URL;

interface Player {
  publicKey: string;
  username: string;
  coins: number;
  hp: number;
  banned: boolean;
  skinId: number;
  damageLevel: number;
  multiplierLevel: number;
  healthLevel: number;
  attackRangeLevel: number;
  flyLevel: number;
  criticalHitLevel: number;
  rewardAddress: string;
  suspendedUntil: number;
}

interface AdminStats {
  total_players: number;
  total_coins: number;
  banned_players: number;
}

const truncateKey = (k: string) => `${k.slice(0, 8)}…${k.slice(-6)}`;

const COLUMNS: Column<Player>[] = [
  {
    key: "username",
    header: "Username",
    sortable: true,
    render: (p) =>
      p.username || <span className="italic text-muted-foreground">—</span>,
  },
  {
    key: "publicKey",
    header: "Public Key",
    sortable: true,
    render: (p) => (
      <span className="font-mono text-xs text-muted-foreground">
        {truncateKey(p.publicKey)}
      </span>
    ),
  },
  {
    key: "coins",
    header: "Coins",
    sortable: true,
    align: "right",
    render: (p) => (
      <span className="font-semibold tabular-nums text-amber-400">
        {p.coins.toLocaleString()}
      </span>
    ),
  },
  {
    key: "hp",
    header: "HP",
    sortable: true,
    align: "right",
    render: (p) => <span className="text-primary tabular-nums">{p.hp}</span>,
  },
  {
    key: "skinId",
    header: "Skin",
    sortable: true,
    align: "center",
  },
  {
    key: "damageLevel",
    header: "Dmg",
    sortable: true,
    align: "center",
    render: (p) => <span className="text-red-400">{p.damageLevel}</span>,
  },
  {
    key: "multiplierLevel",
    header: "Mult",
    sortable: true,
    align: "center",
    render: (p) => <span className="text-amber-400">{p.multiplierLevel}</span>,
  },
  {
    key: "healthLevel",
    header: "Hlth",
    sortable: true,
    align: "center",
    render: (p) => <span className="text-primary">{p.healthLevel}</span>,
  },
  {
    key: "attackRangeLevel",
    header: "Rng",
    sortable: true,
    align: "center",
    render: (p) => <span className="text-blue-400">{p.attackRangeLevel}</span>,
  },
  {
    key: "flyLevel",
    header: "Fly",
    sortable: true,
    align: "center",
    render: (p) => <span className="text-cyan-400">{p.flyLevel}</span>,
  },
  {
    key: "criticalHitLevel",
    header: "Crit",
    sortable: true,
    align: "center",
    render: (p) => (
      <span className="text-orange-400">{p.criticalHitLevel}</span>
    ),
  },
  {
    key: "banned",
    header: "Status",
    align: "center",
    render: (p) =>
      p.banned ? (
        <Badge variant="destructive" size="sm">BANNED</Badge>
      ) : (
        <Badge variant="success" size="sm">ACTIVE</Badge>
      ),
  },
];

const BASIC_FIELDS = [
  { field: "username" as const, label: "Username", type: "text", color: "" },
  { field: "hp" as const, label: "HP", type: "number", color: "text-primary" },
  { field: "skinId" as const, label: "Skin ID", type: "number", color: "" },
];

const LEVEL_FIELDS = [
  { field: "damageLevel" as const, label: "Damage", color: "text-red-400" },
  { field: "multiplierLevel" as const, label: "Multiplier", color: "text-amber-400" },
  { field: "healthLevel" as const, label: "Health", color: "text-primary" },
  { field: "attackRangeLevel" as const, label: "Attack range", color: "text-blue-400" },
  { field: "flyLevel" as const, label: "Fly", color: "text-cyan-400" },
  { field: "criticalHitLevel" as const, label: "Critical hit", color: "text-orange-400" },
];

type ConfirmKind = "delete" | "ban" | "reset-stats" | "reset-levels" | null;

const DatabaseAdmin: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [coinsToAdd, setCoinsToAdd] = useState("");
  const [playersLoading, setPlayersLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/stats`);
      setStats(res.data);
    } catch {
      toast.error("Failed to load statistics");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    setPlayersLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/players`, {
        params: { limit: 1000 },
      });
      if (Array.isArray(res.data.players)) setPlayers(res.data.players);
      else toast.error("Invalid player data received");
    } catch {
      toast.error("Failed to load players");
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const fetchSelected = useCallback(async (publicKey: string) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/player/${publicKey}`);
      setSelected(res.data.player);
    } catch {
      toast.error("Failed to fetch player details");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPlayers();
  }, [fetchStats, fetchPlayers]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(
      (p) =>
        p.username?.toLowerCase().includes(q) ||
        p.publicKey.toLowerCase().includes(q),
    );
  }, [players, search]);

  const updatePlayerData = async (updates: Partial<Player>) => {
    if (!selected) return;
    try {
      await axios.post(
        `${BACKEND_URL}/admin/player/${selected.publicKey}/update`,
        updates,
      );
      toast.success("Player updated");
      fetchStats();
      fetchPlayers();
    } catch {
      toast.error("Failed to update player");
    }
  };

  const updateCoins = async (add: boolean) => {
    if (!selected || !coinsToAdd) return;
    const delta = parseInt(coinsToAdd) * (add ? 1 : -1);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/admin/player/${selected.publicKey}/coins`,
        { coins: delta },
      );
      toast.success(
        `${add ? "Added" : "Removed"} ${Math.abs(delta)} coins · new balance: ${res.data.new_coins}`,
      );
      setCoinsToAdd("");
      fetchSelected(selected.publicKey);
      fetchStats();
    } catch {
      toast.error("Failed to update coins");
    }
  };

  const toggleBan = async () => {
    if (!selected) return;
    try {
      await axios.post(`${BACKEND_URL}/admin/player/${selected.publicKey}/ban`, {
        banned: !selected.banned,
      });
      toast.success(`Player ${selected.banned ? "unbanned" : "banned"}`);
      fetchSelected(selected.publicKey);
      fetchStats();
    } catch {
      toast.error("Failed to toggle ban");
    }
  };

  const deletePlayer = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${BACKEND_URL}/admin/player/${selected.publicKey}/delete`,
      );
      toast.success("Player deleted");
      setSelected(null);
      fetchStats();
      fetchPlayers();
    } catch {
      toast.error("Failed to delete player");
    }
  };

  const resetStats = async () => {
    if (!selected) return;
    try {
      await axios.post(
        `${BACKEND_URL}/admin/player/${selected.publicKey}/reset-stats`,
      );
      toast.success("Statistics reset");
      fetchSelected(selected.publicKey);
    } catch {
      toast.error("Failed to reset statistics");
    }
  };

  const resetLevels = async () => {
    if (!selected) return;
    try {
      await axios.post(
        `${BACKEND_URL}/admin/player/${selected.publicKey}/reset-levels`,
      );
      toast.success("Levels reset to 1");
      fetchSelected(selected.publicKey);
      fetchPlayers();
    } catch {
      toast.error("Failed to reset levels");
    }
  };

  const onConfirm = () => {
    if (confirmKind === "delete") deletePlayer();
    else if (confirmKind === "ban") toggleBan();
    else if (confirmKind === "reset-stats") resetStats();
    else if (confirmKind === "reset-levels") resetLevels();
  };

  const confirmCopy = (() => {
    if (!selected) return null;
    const name = selected.username || truncateKey(selected.publicKey);
    switch (confirmKind) {
      case "delete":
        return {
          title: `Delete "${name}"?`,
          description: "This action cannot be undone.",
          confirmLabel: "Delete",
          destructive: true,
        };
      case "ban":
        return {
          title: selected.banned ? `Unban "${name}"?` : `Ban "${name}"?`,
          description: selected.banned
            ? "Player will regain access immediately."
            : "Player will be locked out until unbanned.",
          confirmLabel: selected.banned ? "Unban" : "Ban",
          destructive: !selected.banned,
        };
      case "reset-stats":
        return {
          title: `Reset statistics for "${name}"?`,
          description: "This action cannot be undone.",
          confirmLabel: "Reset stats",
          destructive: true,
        };
      case "reset-levels":
        return {
          title: `Reset all upgrade levels for "${name}"?`,
          description: "All levels will be set back to 1.",
          confirmLabel: "Reset levels",
          destructive: true,
        };
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-3">
      {statsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total players"
              value={stats.total_players.toLocaleString()}
              accent="blue"
            />
            <StatCard
              label="Total coins"
              value={stats.total_coins.toLocaleString()}
              accent="amber"
            />
            <StatCard
              label="Banned"
              value={stats.banned_players.toLocaleString()}
              accent="red"
            />
          </div>
        )
      )}

      <Card size="compact" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            All players
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlayers}
            disabled={playersLoading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("size-3.5", playersLoading && "animate-spin")}
            />
            {playersLoading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        <Searchbox
          value={search}
          onChange={setSearch}
          placeholder="Filter by username or public key…"
        />

        {playersLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner size={14} /> Loading players…
          </div>
        ) : (
          <div className="space-y-2">
            <DataTable
              data={filtered}
              columns={COLUMNS}
              rowKey={(p) => p.publicKey}
              onRowClick={(p) => fetchSelected(p.publicKey)}
              selectedKey={selected?.publicKey}
              emptyState={
                <EmptyState
                  title={
                    search
                      ? "No players match your search"
                      : "No players found"
                  }
                  description={
                    search
                      ? "Try a different username or key."
                      : "Once players join, they'll appear here."
                  }
                />
              }
            />
            <p className="text-center text-xs text-muted-foreground">
              {search
                ? `${filtered.length} of ${players.length} players`
                : `${players.length} player${players.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
        )}
      </Card>

      {/* Selected player editor */}
      {selected && (
        <Card size="compact" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">
              Edit:{" "}
              <span className="font-semibold text-blue-400">
                {selected.username || truncateKey(selected.publicKey)}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selected.banned ? "default" : "destructive"}
                onClick={() => setConfirmKind("ban")}
                className="gap-1.5"
              >
                {selected.banned ? <ShieldCheck className="size-3.5" /> : <Ban className="size-3.5" />}
                {selected.banned ? "Unban" : "Ban"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmKind("delete")}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
              <Card size="nested" className="space-y-3 bg-background">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Basic information
              </p>
              <div className="flex flex-col gap-3">
                {BASIC_FIELDS.map(({ field, label, type, color }) => (
                  <FormField key={field} label={label} htmlFor={`f-${field}`}>
                    <Input
                      id={`f-${field}`}
                      type={type}
                      value={(selected[field] as string | number) ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [field]:
                            type === "number"
                              ? parseInt(e.target.value) || 0
                              : e.target.value,
                        })
                      }
                      onBlur={(e) =>
                        updatePlayerData({
                          [field]:
                            type === "number"
                              ? parseInt(e.target.value) || 0
                              : e.target.value,
                        })
                      }
                      className={color}
                    />
                  </FormField>
                ))}
                <FormField label="Public key" htmlFor="f-pk">
                  <Input
                    id="f-pk"
                    type="text"
                    value={selected.publicKey}
                    disabled
                    className="font-mono text-xs"
                  />
                </FormField>
              </div>
            </Card>

            <Card size="nested" className="space-y-3 bg-background">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Upgrade levels
              </p>
              <div className="flex flex-col gap-3">
                {LEVEL_FIELDS.map(({ field, label, color }) => (
                  <FormField key={field} label={label} htmlFor={`l-${field}`}>
                    <Input
                      id={`l-${field}`}
                      type="number"
                      value={selected[field] as number}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [field]: parseInt(e.target.value) || 1,
                        })
                      }
                      onBlur={(e) =>
                        updatePlayerData({
                          [field]: parseInt(e.target.value) || 1,
                        })
                      }
                      className={color}
                    />
                  </FormField>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmKind("reset-levels")}
            >
              Reset all levels to 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmKind("reset-stats")}
            >
              Reset statistics
            </Button>
          </div>

          <Card size="nested" className="space-y-3 bg-background">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coins management
              </p>
              <p className="text-xs text-muted-foreground">
                Balance:{" "}
                <span className="font-bold text-amber-400">
                  {selected.coins.toLocaleString()}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                value={coinsToAdd}
                onChange={(e) => setCoinsToAdd(e.target.value)}
                placeholder="Amount…"
                className="flex-1 min-w-[140px]"
              />
              <Button
                size="sm"
                onClick={() => updateCoins(true)}
                disabled={!coinsToAdd}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateCoins(false)}
                disabled={!coinsToAdd}
              >
                Remove
              </Button>
            </div>
          </Card>
        </Card>
      )}

      <ConfirmDialog
        open={confirmKind !== null}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        destructive={confirmCopy?.destructive}
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default DatabaseAdmin;
