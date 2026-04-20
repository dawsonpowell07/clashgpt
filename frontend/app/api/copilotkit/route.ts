import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest, NextResponse } from "next/server";
import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import { auth } from "@clerk/nextjs/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Authenticated users: 200 requests/hour by userId
const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(200, "1 h"),
  prefix: "rl:auth",
});

const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";
const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

const serviceAdapter = new EmptyAdapter();

export const POST = async (req: NextRequest) => {
  const { userId } = await auth();

  if (userId) {
    const { success, reset } = await authRatelimit.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }
  }

  // Forward the real client IP and user ID so the backend can enforce guest rate limits.
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const runtime = new CopilotRuntime({
    agents: {
      clash_gpt: new HttpAgent({
        url: `${BACKEND_URL}/agent`,
        headers: {
          "x-api-key": BACKEND_API_KEY,
          "x-client-ip": clientIp,
          "x-user-id": userId ?? "",
        },
      }),
    },
    runner: new InMemoryAgentRunner(),
  });

  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
  } catch (error) {
    console.error("CopilotKit route error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 },
    );
  }
};
