import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/code-theme.css';

import { initRouter } from './router.js';
import { initAuth } from './services/authService.js';

const root = document.getElementById('app');

// Supabase 세션을 먼저 확인한 뒤 라우터를 시작한다(router.js의 getSession()은 동기 캐시를 읽는다).
initAuth().finally(() => {
  initRouter(root);
});
