import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const text = await req.text();
    const params = new URLSearchParams(text);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    // Construct clean user_info object without any undefined fields
    const userInfo: Record<string, any> = {
      name: session.user.name || "Pemain",
    };
    if (session.user.nickname) {
      userInfo.nickname = session.user.nickname;
    }

    // Authenticate the presence channel using official Pusher SDK method
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: session.user.id,
      user_info: userInfo,
    });

    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("Pusher auth error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
