import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/pages/auth/auth-context';
import { router } from './router';
import './App.css';

function App() {
  return (
    <AuthProvider>
      {/* // react-router 挂载路由的方式 */}
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
