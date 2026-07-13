/** 해시 기반 경량 라우터 (SPA 화면 전환) */
import { getSession } from './services/authService.js';
import { renderAuthView } from './views/authView.js';
import { renderHomeView } from './views/homeView.js';
import { renderRoomView } from './views/roomView.js';
import { clear } from './utils/dom.js';

let currentCleanup = null;

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = hash.split('/');
  return { path: path || 'auth', param: rest.join('/') };
}

export function navigate(path) {
  window.location.hash = `#/${path}`;
}

export function initRouter(root) {
  window.addEventListener('hashchange', () => render(root));
  render(root);
}

function render(root) {
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }
  clear(root);

  const { path, param } = parseHash();
  const session = getSession();

  if (path !== 'auth' && !session) {
    navigate('auth');
    return;
  }
  if (path === 'auth' && session) {
    navigate('home');
    return;
  }

  if (path === 'auth') {
    currentCleanup = renderAuthView(root);
  } else if (path === 'home') {
    currentCleanup = renderHomeView(root);
  } else if (path === 'room' && param) {
    currentCleanup = renderRoomView(root, param, session);
  } else {
    navigate(session ? 'home' : 'auth');
  }
}
