import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { HttpAgent } from "@ag-ui/client";
import { NextRequest, NextResponse } from 'next/server';
import { InMemoryAgentRunner } from '@copilotkit/runtime/v2';
import { auth } from '@clerk/nextjs/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(75, '1 h'),
});

const serviceAdapter = new GoogleGenerativeAIAdapter({ model:  "gemini-2.5-flash"});
const runtime = new CopilotRuntime({
  agents: {
    clash_gpt: new HttpAgent({ url: "http://localhost:8000/agent" }),
  },
  runner: new InMemoryAgentRunner()
});

export const POST = async (req: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success, reset } = await ratelimit.limit(userId);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() },
      }
    );
  }

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
