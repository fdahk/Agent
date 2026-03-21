import { useMemo, useState } from 'react';
import { createDemoModel } from './model';
import { runDemoAgent } from './runtime';
import { createDemoTools } from './tools';
import type { AgentTraceStep } from './types';
import styles from './style.module.scss';

const defaultTask = '请帮我查询上海天气，并给我一个简短的出行携带建议。';

function AgentStudyPage() {
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
    <div className={styles.studyContainer}>
      <div className={styles.phoneShell}>
        <section className={styles.heroCard}>
          <p className={styles.eyebrow}>Agent Study</p>
          <h1>Agent 学习示例</h1>
          <p className={styles.headerDesc}>
            这是一个前端本地运行的学习型示例，用来理解 model、tool、runtime loop 和 trace 的基本关系。
          </p>
          <button className={styles.primaryButton} onClick={handleRunDemo} disabled={isRunning}>
            {isRunning ? '运行中...' : '运行示例'}
          </button>
        </section>

        <section className={styles.card}>
          <h2>任务</h2>
          <textarea
            className={styles.taskInput}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            disabled={isRunning}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>工具注册表</h2>
            <span>{tools.length} 个工具</span>
          </div>
          <div className={styles.stack}>
            {tools.map((tool) => (
              <article key={tool.name} className={styles.block}>
                <div className={styles.metaRow}>
                  <strong>{tool.name}</strong>
                  <span>schema</span>
                </div>
                <p>{tool.description}</p>
                <pre className={styles.codeBlock}>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>运行轨迹</h2>
            <span>{trace.length} 步</span>
          </div>
          {trace.length === 0 ? (
            <div className={styles.emptyState}>点击运行后，这里会展示完整的本地 Agent 轨迹。</div>
          ) : (
            <div className={styles.stack}>
              {trace.map((item) => (
                <article key={item.id} className={`${styles.block} ${styles[item.status]}`}>
                  <div className={styles.metaRow}>
                    <strong>{item.title}</strong>
                    <span>{item.kind}</span>
                  </div>
                  <p>{item.detail}</p>
                  {item.payload ? (
                    <pre className={styles.codeBlock}>{JSON.stringify(item.payload, null, 2)}</pre>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>最终输出</h2>
            <span>本地示例</span>
          </div>
          {runError ? (
            <div className={`${styles.resultPanel} ${styles.errorPanel}`}>{runError}</div>
          ) : finalAnswer ? (
            <pre className={styles.resultPanel}>{finalAnswer}</pre>
          ) : (
            <div className={styles.emptyState}>当前还没有结果。</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AgentStudyPage;
