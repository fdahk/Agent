import { useMemo, useState } from 'react';
import workspaceStyles from './style.module.scss';
import { createDemoModel } from './agent-demo/model';
import { runDemoAgent } from './agent-demo/runtime';
import { createDemoTools } from './agent-demo/tools';
import type { AgentTraceStep } from './agent-demo/types';

const defaultTask = '请帮我查询上海天气，并给我一个简短的出行携带建议。';

function WorkspacePage() {
  const tools = useMemo(() => createDemoTools(), []);
  const model = useMemo(() => createDemoModel(), []);
  const [task, setTask] = useState(defaultTask);
  const [trace, setTrace] = useState<AgentTraceStep[]>([]);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [runError, setRunError] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDemo = async () => {
    setIsRunning(true);
    setTrace([]);
    setFinalAnswer('');
    setRunError('');

    try {
      const result = await runDemoAgent({
        task,
        model,
        tools,
        onTrace: setTrace,
      });
      setFinalAnswer(result.finalAnswer);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : '运行失败');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={workspaceStyles.workspaceContainer}>
      <div className={workspaceStyles.workspaceHeader}>
        <div>
          <p className={workspaceStyles.eyebrow}>Agent Tool</p>
          <h1>Agent Runtime Demo</h1>
          <p className={workspaceStyles.headerDesc}>
            Agent Tool 的关键骨架完整保留下来：工具定义、参数 schema、
            模型决策、运行时循环、工具执行、结果回注、步骤日志和最终输出。
          </p>
        </div>
        <button
          className={workspaceStyles.runButton}
          onClick={handleRunDemo}
          disabled={isRunning}
        >
          {isRunning ? '运行中...' : '运行 Agent'}
        </button>
      </div>

      <div className={workspaceStyles.grid}>
        <section className={workspaceStyles.card}>
          <ul className={workspaceStyles.bulletList}>
            <li>模型本身不执行工具，真正执行动作的是外部 Runtime。</li>
            <li>工具必须带有描述和参数 schema，模型才能稳定决定何时调用。</li>
            <li>运行时需要做工具路由、参数校验、停止条件和 trace 日志。</li>
            <li>工具结果必须重新回注给模型，Agent 才能继续多步推进任务。</li>
          </ul>
        </section>

        <section className={workspaceStyles.card}>
          <h2>任务</h2>
          <textarea
            className={workspaceStyles.taskInput}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            disabled={isRunning}
          />
          <p className={workspaceStyles.helperText}>
            可直接试试：`请帮我查询北京天气，并给我一个简短的出行携带建议。`
          </p>
        </section>
      </div>

      <section className={workspaceStyles.card}>
        <div className={workspaceStyles.sectionHeader}>
          <h2>工具注册表</h2>
          <span>这是给模型看的工具元信息，不是直接暴露执行代码。</span>
        </div>
        <div className={workspaceStyles.toolList}>
          {tools.map((tool) => (
            <article key={tool.name} className={workspaceStyles.toolCard}>
              <div className={workspaceStyles.toolTitleRow}>
                <h3>{tool.name}</h3>
                <span>schema 驱动</span>
              </div>
              <p className={workspaceStyles.toolDescription}>{tool.description}</p>
              <pre className={workspaceStyles.codeBlock}>
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </article>
          ))}
        </div>
      </section>

      <div className={workspaceStyles.grid}>
        <section className={workspaceStyles.card}>
          <div className={workspaceStyles.sectionHeader}>
            <h2>运行轨迹</h2>
            <span>{trace.length} 个步骤</span>
          </div>
          <div className={workspaceStyles.traceList}>
            {trace.length === 0 ? (
              <div className={workspaceStyles.emptyState}>
                点击“运行示例 Agent”后，这里会展示完整的 runtime loop。
              </div>
            ) : (
              trace.map((item) => (
                <article
                  key={item.id}
                  className={`${workspaceStyles.traceItem} ${workspaceStyles[item.status]}`}
                >
                  <div className={workspaceStyles.traceMeta}>
                    <strong>{item.title}</strong>
                    <span>{item.kind}</span>
                  </div>
                  <p>{item.detail}</p>
                  {item.payload ? (
                    <pre className={workspaceStyles.codeBlock}>
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className={workspaceStyles.card}>
          <div className={workspaceStyles.sectionHeader}>
            <h2>最终输出</h2>
            <span>模型只在拿到真实工具结果后才产出结论</span>
          </div>
          {runError ? (
            <div className={`${workspaceStyles.resultPanel} ${workspaceStyles.errorPanel}`}>
              {runError}
            </div>
          ) : finalAnswer ? (
            <pre className={workspaceStyles.resultPanel}>{finalAnswer}</pre>
          ) : (
            <div className={workspaceStyles.emptyState}>
              当前还没有结果。先运行一次示例 Agent。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default WorkspacePage;