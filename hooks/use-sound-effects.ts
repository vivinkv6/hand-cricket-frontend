"use client";

import { Howl } from "howler";
import { useEffect, useRef } from "react";
import { SOUNDS, type MatchResult, type RoundResult, type TeamId } from "@/lib/game/contracts";

export function useSoundEffects(args: {
  roundResult: RoundResult | null;
  result: MatchResult | null;
  myTeamId?: TeamId;
  homeMusic?: boolean;
}) {
  const soundsRef = useRef<Record<string, Howl> | null>(null);
  const lastDeliveryRef = useRef<number>(0);
  const lastResultRef = useRef<string>("");

  useEffect(() => {
    soundsRef.current = {
      home: new Howl({ src: [SOUNDS.HOME_MUSIC], loop: true, volume: 0.18 }),
      bat: new Howl({ src: [SOUNDS.BAT_HIT], volume: 0.45 }),
      cheerSmall: new Howl({ src: [SOUNDS.CHEER_SMALL], volume: 0.4 }),
      cheerBig: new Howl({ src: [SOUNDS.CHEER_BIG], volume: 0.45 }),
      wicket: new Howl({ src: [SOUNDS.WICKET], volume: 0.5 }),
      click: new Howl({ src: [SOUNDS.CLICK], volume: 0.4 }),
      six: new Howl({ src: [SOUNDS.SIX_COMMENTARY], volume: 0.55 }),
      win: new Howl({ src: [SOUNDS.WIN], volume: 0.55 }),
      loss: new Howl({ src: [SOUNDS.LOSS], volume: 0.55 }),
    };

    return () => {
      Object.values(soundsRef.current ?? {}).forEach((sound) => sound.unload());
      soundsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const home = soundsRef.current?.home;
    if (!home) {
      return;
    }

    if (args.homeMusic) {
      if (!home.playing()) {
        home.play();
      }
      return;
    }

    home.stop();
  }, [args.homeMusic]);

  useEffect(() => {
    if (!args.roundResult || !soundsRef.current) {
      return;
    }

    if (lastDeliveryRef.current === args.roundResult.deliveryNumber) {
      return;
    }

    lastDeliveryRef.current = args.roundResult.deliveryNumber;

    if (args.roundResult.isOut) {
      soundsRef.current.wicket.play();
      return;
    }

    soundsRef.current.bat.play();

    if (args.roundResult.runs === 4) {
      soundsRef.current.cheerSmall.play();
    }

    if (args.roundResult.runs === 6) {
      soundsRef.current.cheerBig.play();
      soundsRef.current.six.play();
    }
  }, [args.roundResult]);

  useEffect(() => {
    if (!args.result || !soundsRef.current || !args.myTeamId) {
      return;
    }

    const key = `${args.result.winnerTeamId ?? "tie"}-${args.result.reason}-${args.myTeamId}`;
    if (lastResultRef.current === key) {
      return;
    }

    lastResultRef.current = key;
    if (args.result.winnerTeamId === args.myTeamId) {
      soundsRef.current.win.play();
      return;
    }

    if (args.result.winnerTeamId) {
      soundsRef.current.loss.play();
    }
  }, [args.myTeamId, args.result]);

  return {
    playClick: () => soundsRef.current?.click.play(),
  };
}
