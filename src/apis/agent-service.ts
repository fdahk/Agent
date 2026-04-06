import { createClient } from '@/cores/network';
import { AGENT_SERVER_BASE } from '@/cores/config';
import type { AgentRunEvent, AgentRunResult, CreateAgentRunPayload } from '@/pages/workspace/resource-organizer-agent/types';

const client = createClient(AGENT_SERVER_BASE);

/** 与后端 SSE 的 `event:` 行一致；漏注册会导致该类型事件到达浏览器但无监听器 */
const streamEventTypes: AgentRunEvent['type'][] = [
  'run_started',
  'plan_ready',
  'step_started',
  'resource_collected',
  'resource_summarized',
  'memory_updated',
  'file_written',
  'run_completed',
  'run_failed',
];

class AgentService {
  /** 创建一次 Agent 运行；后端立即返回 runId，进度通过 SSE 推送 */
  async createRun(payload: CreateAgentRunPayload): Promise<{ runId: string }> {
    return client.post<{ runId: string }>('/agent/runs', payload);
  }

  /** 拉取运行快照（含 status / result）；SSE 断线时用于兜底恢复 UI */
  async getRun(runId: string): Promise<{
    id: string;
    status: string;
    createdAt: string;
    result?: AgentRunResult;
  }> {
    return client.get(`/agent/runs/${runId}`);
  }

  /**
   * 打开 SSE（Server-Sent Events）长连接：GET /agent/runs/:runId/stream。
   * - 服务端按事件名推送，对每种 type 注册 addEventListener；payload 在 MessageEvent.data 中为 JSON 字符串。
   * - 调用方需在适当时机 close()，并在 onerror 中按需 getRun 补偿。
   */
  openRunStream(
    runId: string,
    handlers: {
      onEvent: (event: AgentRunEvent) => void;
      onError?: () => void;
    },
  ): EventSource {
    // 创建 EventSource 对象，打开 SSE 连接，EventSource 是浏览器内置对象，用于和服务器建立长连接，
    const eventSource = new EventSource(`${AGENT_SERVER_BASE}/agent/runs/${runId}/stream`);

    for (const eventType of streamEventTypes) {
      eventSource.addEventListener(eventType, (event) => {
        const messageEvent = event as MessageEvent<string>;
        handlers.onEvent(JSON.parse(messageEvent.data) as AgentRunEvent);
      });
    }

    // 网络错误、服务端关闭连接等会触发；不含 HTTP 正文细节，兜底逻辑在页面 onError
    eventSource.onerror = () => {
      handlers.onError?.();
    };

    return eventSource;
  }
}

export default new AgentService();
