import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from 'next/server';


const serviceAdapter = new GoogleGenerativeAIAdapter({ model:  "gemini-2.5-flash"});
const runtime = new CopilotRuntime({
  agents: {
    clash_gpt: new HttpAgent({ url: "http://localhost:8000/agent" }),
  }
});
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};