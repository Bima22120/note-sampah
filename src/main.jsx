import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ============================================================================
// ONE-TIME CLEANUP: Hapus token auth lama yang corrupt
// Ini dijalankan sekali saat versi baru di-deploy untuk fresh start.
// Ubah versi angka di bawah setiap kali perlu force-clear.
// ============================================================================
const AUTH_VERSION = 'v4';
const versionKey = 'notesampah-auth-version';
try {
  if (localStorage.getItem(versionKey) !== AUTH_VERSION) {
    console.log('[NoteSampah] Membersihkan token auth lama...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(versionKey, AUTH_VERSION);
    console.log('[NoteSampah] Token lama dibersihkan. User perlu login ulang.');
  }
} catch (e) {
  // Abaikan jika localStorage tidak tersedia
}

// ============================================================================
// Anti-crash dari ekstensi browser / password manager
// Browser password managers memodifikasi DOM secara langsung yang bertabrakan 
// dengan React Virtual DOM, menyebabkan crash saat refresh/autofill.
// ============================================================================
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };

  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function(newChild, oldChild) {
    if (oldChild.parentNode !== this) {
      return oldChild;
    }
    return originalReplaceChild.apply(this, arguments);
  };
}

// Global error handler untuk DOM errors dari ekstensi
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('removeChild') ||
    event.message.includes('insertBefore') ||
    event.message.includes('replaceChild') ||
    event.message.includes('NotFoundError') ||
    event.message.includes('Node was not found')
  )) {
    event.preventDefault();
    return true;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
