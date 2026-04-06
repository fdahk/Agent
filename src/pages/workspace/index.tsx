import { useNavigate } from 'react-router-dom';
import workspaceStyles from './style.module.scss';
import { agents } from './data';

function WorkspacePage() {
  const navigate = useNavigate();

  return (
    <div className={workspaceStyles.workspaceContainer}>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.agentList}>
          {agents.map((agent) => (
            // article 标签用于表示一个独立的内容块，通常用于博客文章、新闻报道、评论等场景
            <article key={agent.id} className={workspaceStyles.agentCard}>
              <div className={workspaceStyles.agentHeader}>
                <div>
                  <h3>{agent.name}</h3>
                  <p className={workspaceStyles.helperText}>{agent.summary}</p>
                </div>
                <span className={workspaceStyles.statusBadge}>{agent.status}</span>
              </div>
              <div className={workspaceStyles.tagList}>
                {agent.tags.map((tag) => (
                  <span key={tag} className={workspaceStyles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={workspaceStyles.primaryButton}
                onClick={() => navigate(agent.path)}
              >
                进入
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default WorkspacePage;