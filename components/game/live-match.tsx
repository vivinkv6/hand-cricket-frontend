"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  PlayerState,
  PublicRoomState,
  RoundResult,
  TeamId,
} from "@/lib/game/contracts";
import {
  formatEconomy,
  formatOvers,
  getPlayerById,
  getTeamById,
} from "@/lib/game/presentation";
import { useAudioState } from "@/hooks/use-audio-state";

type RoomActions = {
  selectNumber: (number: number) => Promise<void>;
  selectBowler: (bowlerId: string) => Promise<void>;
};

export function LiveMatch({
  room,
  me,
  connected,
  error,
  roundResult,
  playClick,
  actions,
}: {
  room: PublicRoomState;
  me: PlayerState;
  connected: boolean;
  error: string;
  roundResult: RoundResult | null;
  playClick: () => void;
  actions: RoomActions;
}) {
  const [showStats, setShowStats] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isMuted, toggleMute } = useAudioState();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const innings = room.innings;
  const battingTeam = innings ? getTeamById(room, innings.battingTeamId) : null;
  const myTeam = room.teams.find(t => t.id === me.teamId);
  const opponentTeam = room.teams.find(t => t.id !== me.teamId);
  
  const activeBatter = getPlayerById(room, innings?.currentBatterId);
  const activeBowler = getPlayerById(room, innings?.currentBowlerId);

  const mySidePlayer = me.teamId === innings?.battingTeamId ? activeBatter : activeBowler;
  const opponentSidePlayer = me.teamId === innings?.battingTeamId ? activeBowler : activeBatter;

  const isMyTurn = room.awaitingPlayerIds.includes(me.id);
  const canSelectNumbers = Boolean(
    room.status === "live" &&
      innings &&
      !innings.pendingBowlerSelection &&
      [innings.currentBatterId, innings.currentBowlerId].includes(me.id) &&
      me.currentSelection === null
  );

  /**
   * ABSOLUTE TRACKING LOGIC
   * We use the global 'currentTurn' to determine the ball's position in the 1-6 sequence.
   * This ensures that ball 1 is always circle 0, ball 2 is always circle 1, etc.
   * highlightIndex points to where the action IS or JUST WAS.
   */
  const currentTurn = room.currentTurn;
  const highlightIndex = useMemo(() => {
    // Reset to first ball if starting a fresh innings
    if (room.innings?.number === 2 && room.currentTurn === 0) return 0;

    if (!roundResult) return currentTurn % 6;
    // If showing a result, highlight the ball that just happened
    return (roundResult.deliveryNumber - 1) % 6;
  }, [currentTurn, roundResult, room.innings?.number]);


  return (
    <main className="stadium-shell min-h-screen flex flex-col text-white font-sans overflow-hidden">
      {/* 1. BROADCAST TOP BAR */}
      <header className="w-full glass-panel border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="broadcast-label text-slate-400">Match Format</span>
            <span className="broadcast-title text-xl text-primary capitalize">{room.mode} Mode</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div className="flex flex-col">
          <span className="broadcast-label text-slate-400">Match ID</span>
            <button onClick={copyToClipboard} className="group flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
              <span className="broadcast-title text-xl">{room.id}</span>
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all border border-white/5">
                {copied ? <span className="text-primary text-xs font-bold">✓</span> : (
                  <svg className="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="broadcast-label text-red-500">Live Broadcast</span>
             </div>
             <h1 className="broadcast-title text-3xl font-black">
                {battingTeam?.name}: {battingTeam?.score}/{battingTeam?.wickets}
                <span className="text-xl text-slate-400 ml-2">({formatOvers(room.currentTurn)})</span>
             </h1>
        </div>

        <div className="flex items-center gap-4">
            {room.innings?.number === 2 ? (
                <div className="glass-panel px-4 py-2 rounded-xl border-primary/30 flex flex-col items-end">
                    <span className="broadcast-label text-primary">Target: {room.targetScore}</span>
                    <span className="text-xs font-bold text-slate-400">Need {Math.max(0, (room.targetScore || 0) - (battingTeam?.score || 0))} runs</span>
                </div>
            ) : (
                <div className="glass-panel px-4 py-2 rounded-xl border-white/20">
                    <span className="broadcast-label text-slate-400 italic">1st Innings Powerplay</span>
                </div>
            )}
        </div>
      </header>

      {/* 2. THE THREE-COLUMN ARENA */}
      <section className="flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 lg:p-6 overflow-hidden">
        
        {/* LEFT COLUMN: OUR TEAM */}
        <div className="lg:col-span-1 flex flex-col gap-4 order-2 lg:order-1">
          <div className="flex items-center gap-2 px-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="broadcast-label text-emerald-400">Our Squad ({myTeam?.name})</span>
          </div>
          
          <div className="glass-panel p-6 rounded-[2.5rem] flex-1 flex flex-col items-center justify-center text-center gap-4 border-l-4 border-emerald-500/50">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-4xl mb-2">
               {me.teamId === innings?.battingTeamId ? "🏏" : "⚾"}
            </div>
            <h2 className="broadcast-title text-2xl truncate w-full">{mySidePlayer?.name || "Initializing..."}</h2>
            <p className="broadcast-label text-slate-500">{me.teamId === innings?.battingTeamId ? "Acting Batter" : "Active Bowler"}</p>
            
            <div className="w-full grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        {me.teamId === innings?.battingTeamId ? "Runs" : "Wickets"}
                    </span>
                    <span className="text-3xl font-black text-white">
                        {me.teamId === innings?.battingTeamId ? mySidePlayer?.runsScored : mySidePlayer?.wicketsTaken}
                    </span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                        {me.teamId === innings?.battingTeamId ? "Balls" : "Runs Conc."}
                    </span>
                    <span className="text-3xl font-black text-white">
                        {me.teamId === innings?.battingTeamId ? mySidePlayer?.deliveriesPlayed : mySidePlayer?.runsConceded}
                    </span>
                </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: THE PLAYGROUND / PITCH */}
        <div className="lg:col-span-2 flex flex-col gap-4 order-1 lg:order-2 h-full">
            <div className="glass-panel flex-1 rounded-[3rem] p-8 flex flex-col items-center justify-between relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                
                <div className="shrink-0 w-full h-48 flex flex-col items-center justify-center pt-8">
                    <AnimatePresence mode="wait">
                        {roundResult ? (
                            <motion.div key={roundResult.deliveryNumber} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                <div className="broadcast-label text-primary mb-2">Delivery Result</div>
                                <div className={`text-8xl font-black italic drop-shadow-2xl ${roundResult.isOut ? "text-red-500" : "text-white"}`}>
                                    {roundResult.label}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <span className="broadcast-label text-slate-500 animate-pulse">Wait for selection...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Over Timeline - ABSOLUTE SYNCED */}
                <div className="w-full flex flex-col items-center gap-4 mb-8">
                  <div className="flex flex-col items-center">
                    {innings?.number === 2 && (
                       <div className="broadcast-label text-primary text-xs font-black mb-1 animate-bounce">
                         {Math.max(0, (room.targetScore || 0) - (battingTeam?.score || 0))} Runs Needed
                       </div>
                    )}
                    <div className="broadcast-label text-slate-500 text-[10px] uppercase tracking-[0.2em]">This Over</div>
                  </div>

                  <div className="flex justify-center items-center gap-3">
                    {Array.from({ length: 6 }).map((_, i) => {
                        /**
                         * Logic: We align the 6 circles with the current over block.
                         * If currentTurn is 7, circles show balls 7, 8, 9, 10, 11, 12.
                         * The ballData is mapped by finding the match in room.innings.overHistory.
                         */
                        const ballData = innings?.overHistory?.[i];
                        const isHighlight = i === highlightIndex;
                        
                        return (
                            <motion.div 
                              key={i} 
                              animate={isHighlight && !innings?.pendingBowlerSelection && room.status === 'live' ? { scale: [1, 1.1, 1], borderColor: ["rgba(255,255,255,0.1)", "rgba(234, 179, 8, 1)", "rgba(255,255,255,0.1)"] } : {}}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                isHighlight && !innings?.pendingBowlerSelection && room.status === 'live'
                                ? "border-primary text-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] bg-primary/5"
                                : ballData ? (ballData.isOut ? "bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-white/10 border-white/10 text-white") : "bg-transparent border-white/5 text-slate-800"
                              }`}
                            >
                              {ballData ? (ballData.isOut ? "W" : ballData.runs) : ""}
                            </motion.div>
                        )
                    })}
                  </div>
                </div>

                <div className="w-full flex flex-col items-center gap-6 pb-4">
                    <div className="w-full max-w-sm grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                        <motion.button
                        key={num}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!canSelectNumbers || isSubmitting}
                        onClick={async () => {
                            setIsSubmitting(true);
                            playClick();
                            try { await actions.selectNumber(num); } finally { setIsSubmitting(false); }
                        }}
                        className={`h-24 rounded-3xl broadcast-title text-4xl flex items-center justify-center transition-all ${
                            canSelectNumbers && !isSubmitting
                            ? "bg-white/10 hover:bg-white/20 border-white/20 hover:border-primary/50 text-white shadow-xl" 
                            : me.currentSelection === num ? "bg-primary text-black border-primary scale-95" : "bg-white/5 border-white/5 text-slate-700 grayscale"
                        } border-2 overflow-hidden relative group`}
                        >
                        {num}
                        {canSelectNumbers && <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </motion.button>
                    ))}
                    </div>
                    <div className="h-4 flex items-center">
                        <AnimatePresence>
                            {isMyTurn && !innings?.pendingBowlerSelection && me.currentSelection === null && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary broadcast-label font-black text-[10px] uppercase tracking-widest animate-pulse">Your Turn to Play</motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: OPPONENT TEAM */}
        <div className="lg:col-span-1 flex flex-col gap-4 order-3">
          <div className="flex items-center justify-end gap-2 px-2">
            <span className="broadcast-label text-red-400">Opponent Squad ({opponentTeam?.name})</span>
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          </div>
          
          <div className="glass-panel p-6 rounded-[2.5rem] flex-1 flex flex-col items-center justify-center text-center gap-4 border-r-4 border-red-500/50">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center text-4xl mb-2 grayscale">
               {me.teamId === innings?.battingTeamId ? "⚾" : "🏏"}
            </div>
            <h2 className="broadcast-title text-2xl truncate w-full italic">{opponentSidePlayer?.name || "---"}</h2>
            <p className="broadcast-label text-slate-500">{me.teamId === innings?.battingTeamId ? "Opp. Bowler" : "Opp. Batter"}</p>
            
            <div className="w-full grid grid-cols-2 gap-4 mt-4 opacity-75">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{me.teamId === innings?.battingTeamId ? "Wkts" : "Runs"}</span>
                    <span className="text-3xl font-black text-white">{me.teamId === innings?.battingTeamId ? opponentSidePlayer?.wicketsTaken : opponentSidePlayer?.runsScored}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{me.teamId === innings?.battingTeamId ? "Runs Conc." : "Balls"}</span>
                    <span className="text-3xl font-black text-white">{me.teamId === innings?.battingTeamId ? opponentSidePlayer?.runsConceded : opponentSidePlayer?.deliveriesPlayed}</span>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      {room.mode === "team" && (
        <footer className="w-full flex justify-center gap-4 pb-8 px-6 shrink-0">
          <button onClick={() => setShowStats(true)} className="w-full max-w-[200px] glass-panel py-4 rounded-2xl broadcast-label hover:bg-white/10 transition-colors flex items-center justify-center gap-2"><span>📊 Full Stats</span></button>
          <button onClick={() => setShowTeam(true)} className="w-full max-w-[200px] glass-panel py-4 rounded-2xl broadcast-label hover:bg-white/10 transition-colors flex items-center justify-center gap-2"><span>👥 Squads</span></button>
        </footer>
      )}

      {/* SQUADS MODAL */}
      <AnimatePresence>
        {showTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTeam(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-2xl glass-panel p-8 rounded-[3rem] max-h-[85vh] overflow-y-auto no-scrollbar border-t-4 border-emerald-500">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="broadcast-title text-3xl italic text-emerald-400">Match Roster</h2>
                        <button onClick={() => setShowTeam(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">✕</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {room.teams.map(team => (
                            <div key={team.id} className="space-y-4">
                                <div className="border-b border-white/10 pb-2"><span className="broadcast-title text-xl">{team.name} Squad</span></div>
                                <div className="space-y-2">
                                    {room.players.filter(p => p.teamId === team.id).map(p => {
                                        const isBatting = innings?.currentBatterId === p.id;
                                        const isBowling = innings?.currentBowlerId === p.id;
                                        return (
                                            <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isBatting || isBowling ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "bg-white/5 border-white/5"}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${isBatting || isBowling ? "text-primary" : "text-white"}`}>{p.name} {p.id === me.id ? " (You)" : ""}{p.isBot && <span className="ml-2 text-[8px] opacity-40 uppercase">AI</span>}</span>
                                                        {isBatting && <span className="text-[10px] text-primary italic">On Strike</span>}{isBowling && <span className="text-[10px] text-primary italic">Bowling Now</span>}
                                                    </div>
                                                    <div className="text-xl">{isBatting ? "🏏" : isBowling ? "⚾" : ""}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* STATS MODAL */}
      <AnimatePresence>
        {showStats && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStats(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-2xl glass-panel p-8 rounded-[3rem] max-h-[85vh] overflow-y-auto no-scrollbar border-t-4 border-primary">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="broadcast-title text-3xl">Broadcast Data Center</h2>
                        <button onClick={() => setShowStats(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">✕</button>
                    </div>
                    <div className="space-y-8">
                        {room.teams.map(team => {
                            const teamPlayers = room.players.filter(p => p.teamId === team.id);
                            return (
                                <div key={team.id} className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="broadcast-title text-xl text-accent">{team.name}</span>
                                        <span className="broadcast-title text-2xl font-black">{team.score} / {team.wickets} <span className="text-sm text-slate-500">({formatOvers(room.currentTurn)})</span></span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                                                <tr><th className="pb-4 px-2">Player</th><th className="pb-4 text-right">Runs(B)</th><th className="pb-4 text-right">W-R(O)</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {teamPlayers.map(p => (
                                                    <tr key={p.id} className="hover:bg-white/5 transition-colors group"><td className="py-3 px-2 font-bold group-hover:text-primary transition-colors">{p.name}</td><td className="py-3 text-right">{p.runsScored}({p.deliveriesPlayed})</td><td className="py-3 text-right">{p.wicketsTaken}-{p.runsConceded}({formatOvers(p.deliveriesBowled)})</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* BOWLER SELECTION MODAL */}
      <AnimatePresence>
        {innings?.pendingBowlerSelection && me.isCaptain && me.teamId === innings.bowlingTeamId && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 inset-x-0 z-40 glass-panel border-t-4 border-primary rounded-t-[3rem] p-8 pb-16 shadow-[0_-30px_60px_rgba(0,0,0,0.8)]">
            <div className="max-w-4xl mx-auto">
                <h2 className="broadcast-title text-3xl text-center mb-8 italic">Captain's Call: Choose Bowler</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
                {room.players.filter(p => p.teamId === me.teamId && !p.isBot).map(p => (
                    <button key={p.id} onClick={() => { playClick(); actions.selectBowler(p.id); }} className="flex-shrink-0 w-56 glass-panel p-6 rounded-3xl border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all text-left">
                    <p className="broadcast-title text-lg text-white truncate mb-4">{p.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase tracking-widest">Overs</span><span className="text-lg font-black">{formatOvers(p.deliveriesBowled)}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase tracking-widest">Wkts</span><span className="text-lg font-black text-accent">{p.wicketsTaken}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase tracking-widest">ECO</span><span className="text-lg font-black">{formatEconomy(p.runsConceded, p.deliveriesBowled)}</span></div>
                    </div>
                    </button>
                ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={toggleMute} className="fixed bottom-24 right-6 w-14 h-14 glass-panel rounded-full flex items-center justify-center border-white/20 hover:border-primary/50 text-white z-40 shadow-2xl transition-all active:scale-90" title={isMuted ? "Unmute" : "Mute"}>
        {isMuted ? <span className="text-xl rotate-12 opacity-50">🔇</span> : <span className="text-xl animate-pulse">🔊</span>}
      </button>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-500 px-6 py-3 rounded-full text-xs broadcast-label shadow-2xl z-50">⚠️ {error}</div>
      )}
    </main>
  );
}
