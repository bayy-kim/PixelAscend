import PusherServer from "pusher";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!appId) {
  throw new Error("Missing PUSHER_APP_ID environment variable");
}
if (!key) {
  throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY environment variable");
}
if (!secret) {
  throw new Error("Missing PUSHER_SECRET environment variable");
}
if (!cluster) {
  throw new Error("Missing NEXT_PUBLIC_PUSHER_CLUSTER environment variable");
}

export const pusherServer = new PusherServer({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
});
