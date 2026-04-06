import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/pages/layout';
import ChatBotPage from '@/pages/chat-bot';
import ExpandPage from '@/pages/expand';
import WorkspacePage from '@/pages/workspace';
import ResourceOrganizerPage from '@/pages/workspace/resource-organizer-agent';
import AgentStudyPage from '@/pages/workspace/agent-study';
import { CozeAgent } from '@/pages/coze-agent';
import LoginPage from '@/pages/auth/login';
import { AuthGuard } from '@/pages/auth/auth-guard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        path: '/',
        element: <ChatBotPage />, 
      },
      {
        path: '/expand',
        element: <ExpandPage />,
      },
      {
        path: '/expand/coze-agent',
        element: <CozeAgent />,
      },
      {
        path: '/workspace',
        element: <WorkspacePage />,
      },
      {
        path: '/workspace/resource-organizer',
        element: <ResourceOrganizerPage />,
      },
      {
        path: '/workspace/agent-study',
        element: <AgentStudyPage />,
      },
    ],
  },
]);
