export type AgentPlanStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export type AgentPlanStep = {
  id: string;
  title: string;
  detail: string;
  status: AgentPlanStepStatus;
};

export type AgentResource = {
  id: string;
  kind: 'local_file' | 'web_page';
  title: string;
  source: string;
  snippet: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type AgentResourceSummary = {
  resourceId: string;
  title: string;
  source: string;
  kind: 'local_file' | 'web_page';
  category: string;
  tags: string[];
  summary: string;
  relevance: string;
};

export type AgentMemory = {
  keyInsights: string[];
  clusters: Array<{
    name: string;
    takeaway: string;
    sourceIds: string[];
  }>;
};

export type AgentArtifact = {
  name: string;
  path: string;
  size: number;
  kind: 'markdown' | 'json';
};

export type AgentRunResult = {
  runId: string;
  task: string;
  status: 'completed' | 'failed' | 'queued' | 'running';
  model: string;
  input: {
    directories: string[];
    urls: string[];
  };
  plan: AgentPlanStep[];
  resources: AgentResourceSummary[];
  memory: AgentMemory;
  finalAnswer: string;
  artifacts: AgentArtifact[];
  startedAt: string;
  completedAt: string;
};

export type AgentRunEvent =
  | {
      type: 'run_started';
      runId: string;
      payload: {
        task: string;
        model: string;
        input: {
          directories: string[];
          urls: string[];
        };
      };
    }
  | {
      type: 'plan_ready';
      runId: string;
      payload: {
        plan: AgentPlanStep[];
      };
    }
  | {
      type: 'step_started';
      runId: string;
      payload: {
        stepId: string;
        title: string;
        detail: string;
      };
    }
  | {
      type: 'resource_collected';
      runId: string;
      payload: {
        resource: AgentResource;
      };
    }
  | {
      type: 'resource_summarized';
      runId: string;
      payload: AgentResourceSummary;
    }
  | {
      type: 'memory_updated';
      runId: string;
      payload: AgentMemory;
    }
  | {
      type: 'file_written';
      runId: string;
      payload: AgentArtifact;
    }
  | {
      type: 'run_completed';
      runId: string;
      payload: AgentRunResult;
    }
  | {
      type: 'run_failed';
      runId: string;
      payload: {
        message: string;
      };
    };

export type CreateAgentRunPayload = {
  task: string;
  directories: string[];
  urls: string[];
  model?: string;
};
