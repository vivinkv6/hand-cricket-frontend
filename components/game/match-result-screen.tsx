"use client";

import { motion } from "framer-motion";
import type { PlayerState, PublicRoomState } from "@/lib/game/contracts";
import {
  formatOvers,
  formatStrikeRate,
  getResultCopy,
} from "@/lib/game/presentation";
import { useAudioState } from "@/hooks/use-audio-state";


type RoomActions = {
  requestRematch: (preference: "same" | "swap") => Promise<void>;
};

export function MatchResultScreen({
  room,
  me,
  connected,
  error,
  playClick,
  actions,
}: {
  room: PublicRoomState;
  me: PlayerState;
  connected: boolean;
  error: string;
  playClick: () => void;
  actions: RoomActions;
}) {
  const { isMuted, toggleMute } = useAudioState();
  const myTeam = room.teams.find((team) => team.id === me.teamId)!;

  const rivalTeam = room.teams.find((team) => team.id !== me.teamId)!;
  const resultCopy = getResultCopy(room.result, room.mode, me.teamId);

  const winnerTeam = room.teams.find(t => t.id === room.result?.winnerTeamId);

  // Man of the Match Logic (Only for Team human matches where a winner is declared)
  const showMOM = room.mode === 'team' && !room.players.some(p => p.isBot) && !!room.result?.winnerTeamId;
  const momCandidate = showMOM 

    ? [...room.players].sort((a, b) => {
        const scoreA = (a.runsScored * 1) + (a.wicketsTaken * 20);
        const scoreB = (b.runsScored * 1) + (b.wicketsTaken * 20);
        return scoreB - scoreA;
      })[0]
    : null;


  return (
    <main className="stadium-shell min-h-screen flex flex-col items-center p-4">
      <header className="w-full max-w-2xl text-center py-12">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="broadcast-label text-primary mb-4"
        >
          Match Completed
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="broadcast-title text-6xl text-white mb-2"
        >
          {winnerTeam ? `${winnerTeam.name} Wins!` : "It's a Tie!"}
        </motion.h1>
        <p className="text-xl text-slate-400 broadcast-label">
           {resultCopy.subline}
        </p>
      </header>

      <section className="w-full max-w-4xl grid md:grid-cols-2 gap-6 mb-12">
        {room.teams.map(team => (
           <div key={team.id} className="glass-panel p-6 rounded-[2rem]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="broadcast-title text-2xl text-accent">{team.name}</h2>
                <span className="broadcast-title text-3xl">{team.score} / {team.wickets}</span>
              </div>
              
              <div className="space-y-3">
                 {room.players.filter(p => p.teamId === team.id).map(p => (
                   <div key={p.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{p.name} {p.id === me.id ? "(You)" : ""}</span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500">
                          Bat: {p.runsScored}({p.deliveriesPlayed}) • Bowl: {p.wicketsTaken}/{p.runsConceded}({formatOvers(p.deliveriesBowled)})
                        </span>
                      </div>
                      <span className="broadcast-title text-lg text-primary">
                        {(p.runsScored * 1) + (p.wicketsTaken * 20)}
                      </span>
                   </div>
                 ))}
              </div>
           </div>
        ))}
      </section>

      {/* Man of the Match Section */}
      {momCandidate && (
        <motion.section 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-full max-w-2xl bg-primary/10 border-2 border-primary/30 rounded-[2.5rem] p-8 text-center mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="broadcast-title text-8xl">★</span>
          </div>
          <p className="broadcast-label text-primary mb-2">Man of the Match</p>
          <h2 className="broadcast-title text-5xl text-white mb-4">{momCandidate.name}</h2>
          <div className="flex justify-center gap-8 broadcast-label text-slate-300">
            <span>Runs: {momCandidate.runsScored}</span>
            <span>Wickets: {momCandidate.wicketsTaken}</span>
          </div>
        </motion.section>
      )}

      {Object.keys(room.rematchVotes).length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap justify-center gap-2"
        >
          {Object.keys(room.rematchVotes).map(playerId => {
            const voter = room.players.find(p => p.id === playerId);
            if (!voter) return null;
            return (
              <span key={playerId} className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-[10px] uppercase tracking-widest text-primary font-black">
                {voter.name} Ready
              </span>
            );
          })}
        </motion.div>
      )}

      <footer className="w-full max-w-2xl flex gap-4 mb-24">

         {room.rematchVotes[me.id] ? (
            <div className="flex-1 glass-panel py-5 rounded-2xl border-primary/30 flex items-center justify-center gap-3">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               <span className="broadcast-title text-xl text-primary">Awaiting Others...</span>
            </div>
         ) : (
            <button 
              onClick={() => { playClick(); actions.requestRematch("same"); }}
              className="flex-1 bg-primary text-surface py-5 rounded-2xl broadcast-title text-xl hover:scale-105 transition-transform"
            >
              Rematch
            </button>
         )}
         <button 
           onClick={() => { window.location.href = "/"; }}
           className="flex-1 glass-panel py-5 rounded-2xl broadcast-title text-xl hover:bg-white/10 transition-colors"
         >
           Main Menu
         </button>
      </footer>


      <button
        onClick={toggleMute}
        className="fixed bottom-8 right-6 w-14 h-14 glass-panel rounded-full flex items-center justify-center border-white/20 hover:border-primary/50 text-white z-40 shadow-2xl transition-all active:scale-90"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <span className="text-xl rotate-12 opacity-50">🔇</span>
        ) : (
          <span className="text-xl animate-pulse">🔊</span>
        )}
      </button>
    </main>
  );
}

