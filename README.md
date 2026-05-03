# Hand Cricket Client

This client powers the live player experience for Hand Cricket. It focuses on quick room entry, clear match flow, and a realtime multiplayer experience.

## What The Game Includes

- Solo matches against a bot
- Private `1v1` matches
- Team matches from `2v2` to `5v5`
- Spectator mode for watching live rooms
- Replay viewing for completed matches
- Reconnect support so players can return to an active room after refresh

## Game Modes

- `Solo`
  - A fast practice mode against a bot
  - Starts quickly with minimal setup
- `1v1`
  - A private room for head-to-head play
  - Each side controls one player
- `Teams`
  - Team-based matches from `2v2` to `5v5`
  - Captains manage team flow during the match

## How A Match Flows

- A player creates a room or joins an existing room
- Teams are arranged before the game begins
- The match starts with a toss
- The toss winner decides whether to bat or bowl first
- During live play, the batter and bowler choose numbers for each delivery
- If the numbers match, it is a wicket
- If the numbers do not match, the batter scores runs
- After the first innings ends, the teams switch roles
- The second side chases the target
- The match ends with a result screen and rematch option

## What Players See

- A home screen for creating, joining, or spectating rooms
- A lobby for room setup before the match begins
- A live match screen for active gameplay
- A spectator view for watching without playing
- A result screen after the match ends

## What Has Been Built In The Client

- Smooth room creation and join flow
- Room-code based entry for multiplayer matches
- Spectator access for live rooms
- Visual handling for toss, live turns, innings switch, and match result
- Support for captain-led team play
- Local session memory for reconnecting players
- Audio feedback and mute support
- Replay route for match viewing
