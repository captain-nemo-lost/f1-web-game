import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

let root = (window as any).__REACT_ROOT__;
if (!root) {
  root = createRoot(document.getElementById('root')!);
  (window as any).__REACT_ROOT__ = root;
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
