import "dotenv/config";
import { AccessToken } from "livekit-server-sdk";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  TrackKind,
  dispose,
  Participant,
} from "@livekit/rtc-node";

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const ROOM_NAME = process.env.ROOM_NAME ?? "";
const AGENT_IDENTITY = process.env.AGENT_IDENTITY ?? "orbit-agent";

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !ROOM_NAME) {
  console.error(
    "Missing LiveKit env vars. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, ROOM_NAME."
  );
  process.exit(1);
}

async function createAgentToken(roomName: string, identity: string) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}
async function main() {
  const token = await createAgentToken(ROOM_NAME, AGENT_IDENTITY);

  const room = new Room();
  await room.connect(LIVEKIT_URL, token, {
    autoSubscribe: true,
    dynacast: true,
  });
  console.log("Connected to room:", room.name);

  room
    .on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
      console.log("Participant connected:", p.identity);
    })
    .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      console.log("Participant disconnected:", p.identity);
    })
    .on(RoomEvent.DataReceived, (payload, participant) => {
      const from = participant?.identity ?? "unknown";
      try {
        const json = JSON.parse(new TextDecoder().decode(payload));
        console.log("Data from", from, json);
        if (json.type === "code_update") {
          console.log(
            ">> Code update snippet:",
            (json.code as string).slice(0, 120),
            "…"
          );
        }
      } catch (err) {
        console.warn("Failed to parse data from", from, err);
      }
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const ids = speakers.map((s) => s.identity).join(", ");
      console.log("Active speakers:", ids || "(none)");
    })
    .on(
      RoomEvent.TrackSubscribed,
      (
        track,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (publication.kind === TrackKind.KIND_AUDIO) {
          console.log(
            `Subscribed to audio track from ${participant.identity}, source=${publication.source}`
          );
          // TODO: pipe this audio into STT
        }
      }
    )
    .on(RoomEvent.Disconnected, async () => {
      console.log("Disconnected from room, cleaning up");
      await dispose();
      process.exit(0);
    });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, disconnecting");
    await room.disconnect();
    await dispose();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Worker error:", err);
  process.exit(1);
});
