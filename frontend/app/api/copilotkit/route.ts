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
  limiter: Ratelimit.slidingWindow(100000, '1 h'),
});

const BACKEND_API_KEY = process.env.BACKEND_API_KEY || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const serviceAdapter = new GoogleGenerativeAIAdapter({ model:  "gemini-2.5-flash"});
const runtime = new CopilotRuntime({
  agents: {
    clash_gpt: new HttpAgent({
      url: `${BACKEND_URL}/agent`,
      headers: {
        'x-api-key': BACKEND_API_KEY,
      },
    }),
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

  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/api/copilotkit',
    });

    return handleRequest(req);
  } catch (error) {
    console.error('CopilotKit route error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
};
