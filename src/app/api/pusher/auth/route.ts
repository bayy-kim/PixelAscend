import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "guest_admin";
    const userName = session?.user?.name || "Admin Bayu";

    const text = await req.text();
    const params = new URLSearchParams(text);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    // Authenticate the presence channel using official Pusher SDK method
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: userId,
      user_info: {
        name: userName,
      },
    });

    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("Pusher auth error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
