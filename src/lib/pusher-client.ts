import PusherClient from "pusher-js";

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!pusherKey) {
  throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY environment variable");
}
if (!pusherCluster) {
  throw new Error("Missing NEXT_PUBLIC_PUSHER_CLUSTER environment variable");
}

export const pusherClient = new PusherClient(
  pusherKey,
  {
    cluster: pusherCluster,
    authEndpoint: "/api/pusher/auth", // presence channel auth endpoint
  }
);
