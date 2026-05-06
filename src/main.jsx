import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ============================================================================
// Anti-crash dari ekstensi browser / password manager (Brave, Chrome Autofill, LastPass, dll)
// Browser password managers sering memodifikasi DOM secara langsung (menambah/menghapus node)
// yang bertabrakan dengan React Virtual DOM, menyebabkan crash saat refresh/autofill.
// Patch ini menangkap error tersebut agar aplikasi tetap berjalan.
// ============================================================================
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      console.warn('[NoteSampah] removeChild dicegah: node telah dimodifikasi oleh browser/ekstensi.');
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[NoteSampah] insertBefore dicegah: node telah dimodifikasi oleh browser/ekstensi.');
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };

  // Tambahan: patch replaceChild juga (beberapa password manager menggunakannya)
  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function(newChild, oldChild) {
    if (oldChild.parentNode !== this) {
      console.warn('[NoteSampah] replaceChild dicegah: node telah dimodifikasi oleh browser/ekstensi.');
      return oldChild;
    }
    return originalReplaceChild.apply(this, arguments);
  };
}

// ============================================================================
// Global error handler untuk menangkap unhandled errors dari ekstensi browser
// ============================================================================
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('removeChild') ||
    event.message.includes('insertBefore') ||
    event.message.includes('replaceChild') ||
    event.message.includes('NotFoundError') ||
    event.message.includes('Node was not found')
  )) {
    console.warn('[NoteSampah] Error DOM dari browser/ekstensi ditangkap dan diabaikan:', event.message);
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && (
    event.reason.message.includes('removeChild') ||
    event.reason.message.includes('NotFoundError')
  )) {
    console.warn('[NoteSampah] Unhandled rejection dari browser/ekstensi ditangkap:', event.reason.message);
    event.preventDefault();
    return true;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
