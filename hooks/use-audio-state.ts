"use client";

import { useEffect, useState } from "react";
import { Howler } from "howler";

const STORAGE_KEY = "hand-cricket:muted";

export function useAudioState() {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved === "true";
    setIsMuted(initial);
    Howler.mute(initial);
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    Howler.mute(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return { isMuted, toggleMute };
}
