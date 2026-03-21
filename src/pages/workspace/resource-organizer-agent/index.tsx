import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import agentService from '@/apis/agent-service';
import styles from './style.module.scss';
import type {
  AgentArtifact,
  AgentMemory,
  AgentPlanStep,
  AgentResource,
  AgentResourceSummary,
  AgentRunEvent,
} from './types';

const defaultTask = '收集指定目录和网页里的资料，自动整理成结构化报告，并给出关键洞察。';
const defaultModel = 'qwen2.5:7b';

function ResourceOrganizerPage() {
  const [task, setTask] = useState(defaultTask);
  const [directories, setDirectories] = useState<string[]>(['']);
  const [urls, setUrls] = useState<string[]>(['']);
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');
  const [plan, setPlan] = useState<AgentPlanStep[]>([]); // 执行计划
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [collectedResources, setCollectedResources] = useState<AgentResource[]>([]);
  const [resourceSummaries, setResourceSummaries] = useState<AgentResourceSummary[]>([]);
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]); // file_written 事件累积
  const [finalAnswer, setFinalAnswer] = useState('');
  const [runError, setRunError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  /** 当前运行的 SSE（EventSource）；需在卸载、重跑、完成/失败时 close，避免泄漏与重复监听 */
  const streamRef = useRef<EventSource | null>(null);
  /** 已为终态（完成/失败）或已从快照恢复时置 true，避免 onerror 里重复 getRun / 重复收尾 */
  const runSettledRef = useRef(false);

  // 去除空格和空字符串，过滤掉空字符串,使用useMemo缓存指定依赖的计算结果
  const normalizedDirectories = useMemo(
    () => directories.map((item) => item.trim()).filter(Boolean),
    [directories],
  );
  const normalizedUrls = useMemo(() => urls.map((item) => item.trim()).filter(Boolean), [urls]); 

  useEffect(() => () => {
    streamRef.current?.close();
  }, []);

  const appendEvent = (event: AgentRunEvent) => {
    // 函数式更新：基于最新 previous 拼新数组，避免连续 SSE 时闭包读到旧 events；不可变更新
    setEvents((previous) => [event, ...previous].slice(0, 80));
  };

  const resetRuntimeState = () => {
    setRunId('');
    setStatus('idle');
    setPlan([]);
    setEvents([]);
    setCollectedResources([]);
    setResourceSummaries([]);
    setMemory(null);
    setArtifacts([]);
    setFinalAnswer('');
    setRunError('');
  };

  // 更新输入框的值
  const updateLine = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    setter((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addLine = (setter: Dispatch<SetStateAction<string[]>>) => {
    setter((previous) => [...previous, '']);
  };

  const removeLine = (setter: Dispatch<SetStateAction<string[]>>, index: number) => {
    setter((previous) => (previous.length === 1 ? [''] : previous.filter((_, itemIndex) => itemIndex !== index)));
  };

  // 标记计划步骤为运行中
  const markPlanStepRunning = (stepId: string) => {
    setPlan((previous) =>
      previous.map((item) => {
        if (item.id === stepId) {
          return { ...item, status: 'running' };
        }

        if (item.status === 'running') {
          return { ...item, status: 'completed' };
        }

        return item;
      }),
    );
  };

  /** 关闭 EventSource 并清空 ref；完成/失败/重跑/卸载前均应调用 */
  const closeStream = () => {
    streamRef.current?.close();
    streamRef.current = null;
  };

  // 应用完成结果
  const applyCompletedResult = (event: Extract<AgentRunEvent, { type: 'run_completed' }>) => {
    runSettledRef.current = true;
    setStatus('completed');
    setIsRunning(false);
    setPlan(event.payload.plan);
    setResourceSummaries(event.payload.resources);
    setMemory(event.payload.memory);
    setArtifacts(event.payload.artifacts);
    setFinalAnswer(event.payload.finalAnswer);
    closeStream();
  };

  /** SSE 回调：每条后端事件先写入时间线，再按 type 增量更新各块 state */
  const handleStreamEvent = (event: AgentRunEvent) => {
    appendEvent(event);

    switch (event.type) {
      case 'run_started':
        setStatus('running');
        return;
      case 'plan_ready':
        setPlan(event.payload.plan);
        return;
      case 'step_started':
        markPlanStepRunning(event.payload.stepId);
        return;
      case 'resource_collected':
        setCollectedResources((previous) => [...previous, event.payload.resource]);
        return;
      case 'resource_summarized':
        setResourceSummaries((previous) => [...previous, event.payload]);
        return;
      case 'memory_updated':
        setMemory(event.payload);
        return;
      case 'file_written':
        setArtifacts((previous) => [...previous, event.payload]);
        return;
      case 'run_completed':
        applyCompletedResult(event);
        return;
      case 'run_failed':
        runSettledRef.current = true;
        setStatus('failed');
        setRunError(event.payload.message);
        setIsRunning(false);
        closeStream();
        return;
    }
  };

  const handleRunAgent = async () => {
    if (!task.trim()) {
      setRunError('请先输入任务描述。');
      return;
    }

    if (normalizedDirectories.length === 0 && normalizedUrls.length === 0) {
      setRunError('至少填写一个目录或一个 URL。');
      return;
    }

    closeStream();
    resetRuntimeState();
    runSettledRef.current = false;
    setIsRunning(true);
    setStatus('starting');

    try {
      // 1) POST 只拿 runId
      const created = await agentService.createRun({
        task: task.trim(),
        directories: normalizedDirectories,
        urls: normalizedUrls,
        model: defaultModel,
      });

      setRunId(created.runId);

      // 2) 再 GET 打开 SSE；后端会先重放已写入的 events，再推送后续 publish
      streamRef.current = agentService.openRunStream(created.runId, {
        onEvent: handleStreamEvent,
        onError: async () => {
          if (runSettledRef.current) {
            return;
          }

          try {
            // 3) 流异常时用 REST 快照兜底：可能已完成但漏了最后几条 SSE，或仅连接中断
            const snapshot = await agentService.getRun(created.runId);

            if (snapshot.result) {
              applyCompletedResult({
                type: 'run_completed',
                runId: created.runId,
                payload: snapshot.result,
              });
              return;
            }

            if (snapshot.status === 'failed') {
              runSettledRef.current = true;
              setStatus('failed');
              setRunError('后端运行失败，请查看事件流或后端日志。');
              setIsRunning(false);
              closeStream();
            }
          } catch {
            runSettledRef.current = true;
            setStatus('failed');
            setRunError('流式连接中断，且无法读取运行状态。');
            setIsRunning(false);
            closeStream();
          }
        },
      });
    } catch (error) {
      setRunError(error instanceof Error ? error.message : '运行失败');
      setStatus('failed');
      setIsRunning(false);
    }
  };

  const renderLineGroup = (
    title: string,
    values: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    placeholder: string,
  ) => (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => addLine(setter)}
          disabled={isRunning}
        >
          新增
        </button>
      </div>
      <div className={styles.lineGroup}>
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className={styles.lineRow}>
            <input
              className={styles.textInput}
              value={value}
              onChange={(event) => updateLine(setter, index, event.target.value)}
              placeholder={placeholder}
              disabled={isRunning}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => removeLine(setter, index)}
              disabled={isRunning}
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  const statusText = {
    idle: '待运行',
    starting: '正在创建任务',
    running: '流式执行中',
    completed: '已完成',
    failed: '已失败',
  }[status];

  return (
    <div className={styles.workspaceContainer}>
      <div className={styles.phoneShell}>
        <section className={styles.heroCard}>
          <p className={styles.eyebrow}>Resource Organizer Agent</p>
          <h1>资源整理 Agent</h1>
          <p className={styles.headerDesc}>
            666
          </p>
          <div className={styles.statusRow}>
            <span className={styles.statusBadge}>{statusText}</span>
            <span className={styles.modelBadge}>{defaultModel}</span>
          </div>
          {runId ? <p className={styles.runId}>Run ID: {runId}</p> : null}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>prompt</h2>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleRunAgent}
              disabled={isRunning}
            >
              {isRunning ? '执行中...' : '启动 Agent'}
            </button>
          </div>
          <textarea
            className={styles.taskInput}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            disabled={isRunning}
          />
          <p className={styles.helperText}>
            示例：请扫描我给出的目录和网页，把主题、重复信息、关键结论整理成一份可直接复用的报告。
          </p>
        </section>

        {renderLineGroup('本地目录', directories, setDirectories, '例如 D:\\AiAgent\\docs')}
        {renderLineGroup('网页 URL', urls, setUrls, '例如 https://ollama.com/blog')}

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>执行计划</h2>
            <span>{plan.length} 步</span>
          </div>
          {plan.length === 0 ? (
            <div className={styles.emptyState}>启动后会在这里显示后端规划出的执行步骤。</div>
          ) : (
            <div className={styles.planList}>
              {plan.map((step) => (
                <article key={step.id} className={`${styles.planItem} ${styles[step.status]}`}>
                  <div className={styles.planTitleRow}>
                    <strong>{step.title}</strong>
                    <span>{step.status}</span>
                  </div>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>已采集资源</h2>
            <span>{collectedResources.length}</span>
          </div>
          {collectedResources.length === 0 ? (
            <div className={styles.emptyState}>后端采集到本地文件或网页后，会逐条出现在这里。</div>
          ) : (
            <div className={styles.resourceList}>
              {collectedResources.map((resource) => (
                <article key={resource.id} className={styles.resourceCard}>
                  <div className={styles.planTitleRow}>
                    <strong>{resource.title}</strong>
                    <span>{resource.kind}</span>
                  </div>
                  <p className={styles.sourceText}>{resource.source}</p>
                  <p>{resource.snippet}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>摘要与记忆</h2>
            <span>{resourceSummaries.length} 条摘要</span>
          </div>
          {resourceSummaries.length === 0 ? (
            <div className={styles.emptyState}>资源摘要生成后会在这里展示。</div>
          ) : (
            <div className={styles.resourceList}>
              {resourceSummaries.map((resource) => (
                <article key={resource.resourceId} className={styles.resourceCard}>
                  <div className={styles.planTitleRow}>
                    <strong>{resource.title}</strong>
                    <span>{resource.category}</span>
                  </div>
                  <p>{resource.summary}</p>
                  <p className={styles.tagRow}>{resource.tags.join(' · ')}</p>
                  <p className={styles.helperText}>{resource.relevance}</p>
                </article>
              ))}
            </div>
          )}
          {memory ? (
            <div className={styles.memoryPanel}>
              <h3>全局记忆</h3>
              <ul className={styles.bulletList}>
                {memory.keyInsights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>事件流</h2>
            <span>{events.length}</span>
          </div>
          {events.length === 0 ? (
            <div className={styles.emptyState}>这里会实时展示后端通过 SSE 推送的运行事件。</div>
          ) : (
            <div className={styles.eventList}>
              {events.map((event, index) => (
                <article key={`${event.type}-${index}`} className={styles.eventItem}>
                  <div className={styles.planTitleRow}>
                    <strong>{event.type}</strong>
                    <span>{event.runId.slice(-8)}</span>
                  </div>
                  <pre className={styles.codeBlock}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2>最终结果</h2>
            <span>会同步落盘到后端输出目录</span>
          </div>
          {runError ? (
            <div className={`${styles.resultPanel} ${styles.errorPanel}`}>{runError}</div>
          ) : finalAnswer ? (
            <pre className={styles.resultPanel}>{finalAnswer}</pre>
          ) : (
            <div className={styles.emptyState}>任务完成后，这里会展示最终整理报告。</div>
          )}
          {artifacts.length > 0 ? (
            <div className={styles.artifactList}>
              {artifacts.map((artifact) => (
                <article key={artifact.path} className={styles.artifactItem}>
                  <strong>{artifact.name}</strong>
                  <p>{artifact.path}</p>
                  <span>
                    {artifact.kind} · {artifact.size} bytes
                  </span>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ResourceOrganizerPage;
