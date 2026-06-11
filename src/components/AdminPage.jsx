import React, { useState, useEffect, useRef } from 'react';
import {
  login, changePassword, getAdminPlaylists,
  createPlaylist, updatePlaylist, deletePlaylist,
  isLoggedIn, clearToken,
} from '../api.js';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  return <AdminPanel onLogout={() => { clearToken(); setLoggedIn(false); }} />;
}

/* ─── Login ─────────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!pass) return;
    setLoading(true); setError('');
    try {
      await login(pass);
      onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.loginBg}>
      <div style={S.loginBox}>
        <div style={S.loginLogo}>
          <span style={S.logoRed}>উলিপুর</span><span style={S.logoWhite}> TV</span>
        </div>
        <p style={S.loginSub}>Admin Panel</p>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            style={S.input}
            type="password"
            placeholder="পাসওয়ার্ড লিখুন"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handle()}
            autoFocus
          />
          {error && <p style={S.errorTxt}>⚠ {error}</p>}
          <button style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1 }} onClick={handle} disabled={loading}>
            {loading ? 'লোড হচ্ছে...' : 'Login করুন'}
          </button>
        </div>
        <p style={S.loginHint}>ডিফল্ট: <code style={S.code}>ulipur2024</code></p>
      </div>
    </div>
  );
}

/* ─── Admin Panel ────────────────────────────────────────── */
function AdminPanel({ onLogout }) {
  const [playlists, setPlaylists] = useState([]);
  const [view, setView] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try { setPlaylists(await getAdminPlaylists()); }
    catch (e) { showToast('⚠ ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" মুছে ফেলবেন?`)) return;
    try {
      await deletePlaylist(id);
      reload();
      showToast('🗑 মুছে ফেলা হয়েছে');
    } catch (e) { showToast('⚠ ' + e.message); }
  };

  const handleToggle = async (id, current) => {
    try {
      await updatePlaylist(id, { active: !current });
      reload();
    } catch (e) { showToast('⚠ ' + e.message); }
  };

  const NAV = [['list','📋','Playlists'],['add','➕','যোগ করুন'],['settings','⚙️','Settings']];
  const isMobile = window.innerWidth < 640;

  return (
    <div style={{...S.adminBg, flexDirection: isMobile ? 'column' : 'row'}}>

      {/* Desktop: Sidebar */}
      {!isMobile && (
        <aside style={S.sidebar}>
          <div style={S.sidebarLogo}>
            <span style={S.logoRed}>উলিপুর</span><span style={S.logoWhite}> TV</span>
            <span style={S.adminBadge}>Admin</span>
          </div>
          <nav style={S.nav}>
            {NAV.map(([key, icon, label]) => (
              <button key={key}
                style={{ ...S.navItem, ...(view === key ? S.navActive : {}) }}
                onClick={() => { setView(key); setEditTarget(null); }}
              >{icon} {label}</button>
            ))}
          </nav>
          <button style={S.logoutBtn} onClick={onLogout}>⬅ Logout</button>
        </aside>
      )}

      {/* Mobile: Top bar */}
      {isMobile && (
        <div style={S.mobileTopBar}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={S.logoRed}>উলিপুর</span><span style={S.logoWhite}> TV</span>
            <span style={S.adminBadge}>Admin</span>
          </div>
          <button style={S.mobileLogoutBtn} onClick={onLogout}>Logout ⬅</button>
        </div>
      )}

      {/* Content */}
      <main style={{...S.content, flex:1, paddingBottom: isMobile ? 72 : 28}}>
        {toast && <div style={S.toast}>{toast}</div>}

        {view === 'list' && (
          <PlaylistList
            playlists={playlists}
            loading={loading}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onEdit={(p) => { setEditTarget(p); setView('edit'); }}
            onAdd={() => setView('add')}
          />
        )}
        {view === 'add' && (
          <PlaylistForm
            onSave={async (data) => {
              try {
                await createPlaylist(data);
                await reload();
                setView('list');
                showToast('✅ Playlist যোগ হয়েছে!');
              } catch (e) { showToast('⚠ ' + e.message); }
            }}
            onCancel={() => setView('list')}
          />
        )}
        {view === 'edit' && editTarget && (
          <PlaylistForm
            initial={editTarget}
            onSave={async (data) => {
              try {
                await updatePlaylist(editTarget.id, data);
                await reload();
                setView('list');
                showToast('✅ আপডেট হয়েছে!');
              } catch (e) { showToast('⚠ ' + e.message); }
            }}
            onCancel={() => setView('list')}
          />
        )}
        {view === 'settings' && (
          <SettingsPanel onSave={showToast} />
        )}
      </main>

      {/* Mobile: Bottom nav */}
      {isMobile && (
        <nav style={S.mobileBottomNav}>
          {NAV.map(([key, icon, label]) => (
            <button key={key}
              style={{...S.mobileNavBtn, ...(view===key ? S.mobileNavActive : {})}}
              onClick={() => { setView(key); setEditTarget(null); }}
            >
              <span style={{fontSize:20}}>{icon}</span>
              <span style={{fontSize:10, marginTop:2}}>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ─── Playlist List ──────────────────────────────────────── */
function PlaylistList({ playlists, loading, onDelete, onToggle, onEdit, onAdd }) {
  return (
    <div style={S.section}>
      <div style={S.sectionHeader}>
        <div>
          <h2 style={S.sectionTitle}>Playlists</h2>
          <p style={S.sectionSub}>{playlists.length}টি playlist সেভ আছে</p>
        </div>
        <button style={S.primaryBtn} onClick={onAdd}>+ নতুন যোগ করুন</button>
      </div>

      {loading ? (
        <div style={S.loadingBox}><div style={S.spinner} /><p style={{ color: 'var(--text-muted)', marginTop: 12 }}>লোড হচ্ছে...</p></div>
      ) : playlists.length === 0 ? (
        <div style={S.emptyBox}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={S.emptyText}>কোনো playlist নেই</p>
          <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={onAdd}>+ প্রথম Playlist যোগ করুন</button>
        </div>
      ) : (
        <div style={S.cardGrid}>
          {playlists.map((p, idx) => (
            <div key={p.id} style={{ ...S.card, opacity: p.active ? 1 : 0.55 }}>
              <div style={S.cardHeader}>
                <div style={S.cardIndex}>{idx + 1}</div>
                <div style={S.cardInfo}>
                  <div style={S.cardName}>{p.name}</div>
                  {p.description && <div style={S.cardDesc}>{p.description}</div>}
                </div>
                <span style={{ ...S.sourceBadge, background: p.source_type === 'file' ? 'rgba(244,162,97,0.12)' : 'rgba(74,144,226,0.12)', color: p.source_type === 'file' ? '#f4a261' : '#6ba3e8' }}>
                  {p.source_type === 'file' ? '📁 File' : '🔗 URL'}
                </span>
              </div>
              <div style={S.cardUrl}>
                {p.source_type === 'file' ? `📄 ${p.file_name || 'uploaded file'}` : p.url}
              </div>
              <div style={S.cardActions}>
                <button style={{ ...S.actionBtn, ...(p.active ? S.actionOff : S.actionOn) }} onClick={() => onToggle(p.id, p.active)}>
                  {p.active ? '⏸ Hide' : '▶ Show'}
                </button>
                <button style={S.actionBtn} onClick={() => onEdit(p)}>✏️ Edit</button>
                <button style={{ ...S.actionBtn, ...S.actionDanger }} onClick={() => onDelete(p.id, p.name)}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Playlist Form ──────────────────────────────────────── */
function PlaylistForm({ initial, onSave, onCancel }) {
  const [tab, setTab] = useState(initial?.source_type === 'file' ? 'file' : 'url');
  const [name, setName] = useState(initial?.name || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState(initial?.file_name || '');
  const [fileReady, setFileReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (!text.includes('#EXTINF') && !text.includes('#EXTM3U')) {
        return setError('এটি valid M3U file নয়। সঠিক .m3u/.m3u8 file দিন।');
      }
      setFileContent(text);
      setFileName(file.name);
      setFileReady(true);
      if (!name) setName(file.name.replace(/\.(m3u8?|txt)$/i, ''));
    };
    reader.onerror = () => setError('File পড়া সম্ভব হয়নি');
    reader.readAsText(file, 'UTF-8');
  };

  const handle = async () => {
    if (!name.trim()) return setError('Playlist এর নাম দিন');
    setSaving(true); setError('');
    try {
      if (tab === 'url') {
        if (!url.trim() || !url.startsWith('http')) throw new Error('সঠিক HTTP URL দিন');
        await onSave({ name, description, source_type: 'url', url });
      } else {
        if (!fileContent && !initial) throw new Error('M3U file select করুন');
        const payload = { name, description, source_type: 'file', file_name: fileName };
        if (fileContent) payload.file_content = fileContent;
        await onSave(payload);
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={S.section}>
      <div style={S.sectionHeader}>
        <div>
          <h2 style={S.sectionTitle}>{initial ? 'Playlist Edit করুন' : 'নতুন Playlist যোগ করুন'}</h2>
          <p style={S.sectionSub}>M3U URL বা File দিয়ে channel list যোগ করুন</p>
        </div>
      </div>
      <div style={S.form}>
        {/* Name */}
        <div style={S.formGroup}>
          <label style={S.label}>Playlist নাম *</label>
          <input style={S.input} placeholder="যেমন: BD Sports, Bangla Channels..." value={name}
            onChange={e => { setName(e.target.value); setError(''); }} />
        </div>

        {/* Source type tabs */}
        {!initial && (
          <div style={S.formGroup}>
            <label style={S.label}>Source ধরন</label>
            <div style={S.sourceTabs}>
              <button style={{ ...S.sourceTab, ...(tab === 'url' ? S.sourceTabActive : {}) }} onClick={() => { setTab('url'); setError(''); }}>
                🔗 URL দিয়ে
              </button>
              <button style={{ ...S.sourceTab, ...(tab === 'file' ? S.sourceTabActive : {}) }} onClick={() => { setTab('file'); setError(''); }}>
                📁 File আপলোড
              </button>
            </div>
          </div>
        )}

        {/* URL */}
        {tab === 'url' && (
          <div style={S.formGroup}>
            <label style={S.label}>M3U URL *</label>
            <input style={S.input} placeholder="https://example.com/playlist.m3u" value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }} />
            <p style={S.inputHint}>Direct M3U বা M3U8 লিংক দিন</p>
          </div>
        )}

        {/* File upload */}
        {tab === 'file' && (
          <div style={S.formGroup}>
            <label style={S.label}>M3U File *</label>
            <input ref={fileRef} type="file" accept=".m3u,.m3u8,.txt" style={{ display: 'none' }} onChange={handleFile} />

            {fileReady ? (
              <div style={S.fileSuccess}>
                <span style={{ fontSize: 22 }}>✅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.fileSuccessName}>{fileName}</div>
                  <div style={S.fileSuccessMeta}>{(fileContent.length / 1024).toFixed(1)} KB · Ready to upload</div>
                </div>
                <button style={S.fileChangeBtn} onClick={() => { setFileContent(null); setFileReady(false); setFileName(''); fileRef.current.value = ''; }}>
                  পরিবর্তন করুন
                </button>
              </div>
            ) : (
              <div style={S.dropZone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile({ target: { files: e.dataTransfer.files } }); }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                <div style={S.dropText}>Click করুন বা file drag করুন</div>
                <div style={S.dropSub}>.m3u · .m3u8 ফাইল সাপোর্ট</div>
              </div>
            )}
            {initial?.source_type === 'file' && !fileReady && (
              <p style={S.inputHint}>✅ আগের file আছে — নতুন file না দিলে পুরানোটাই থাকবে</p>
            )}
          </div>
        )}

        {/* Description */}
        <div style={S.formGroup}>
          <label style={S.label}>বিবরণ (optional)</label>
          <textarea style={{ ...S.input, height: 68, resize: 'vertical' }}
            placeholder="এই playlist সম্পর্কে কিছু লিখুন..."
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {error && <p style={S.errorTxt}>⚠ {error}</p>}
        <div style={S.formActions}>
          <button style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handle} disabled={saving}>
            {saving ? 'সেভ হচ্ছে...' : (initial ? '✅ আপডেট করুন' : '✅ Save করুন')}
          </button>
          <button style={S.ghostBtn} onClick={onCancel}>বাতিল</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Settings ───────────────────────────────────────────── */
function SettingsPanel({ onSave }) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (newPass.length < 6) return setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর');
    if (newPass !== confirmPass) return setError('পাসওয়ার্ড মিলছে না');
    setSaving(true); setError('');
    try {
      await changePassword(newPass);
      setNewPass(''); setConfirmPass('');
      onSave('✅ পাসওয়ার্ড পরিবর্তন হয়েছে!');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.section}>
      <div style={S.sectionHeader}>
        <div><h2 style={S.sectionTitle}>Settings</h2><p style={S.sectionSub}>Admin পাসওয়ার্ড পরিবর্তন করুন</p></div>
      </div>
      <div style={S.form}>
        <div style={S.formGroup}><label style={S.label}>নতুন পাসওয়ার্ড</label>
          <input style={S.input} type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setError(''); }} /></div>
        <div style={S.formGroup}><label style={S.label}>পাসওয়ার্ড নিশ্চিত করুন</label>
          <input style={S.input} type="password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setError(''); }} /></div>
        {error && <p style={S.errorTxt}>⚠ {error}</p>}
        <button style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handle} disabled={saving}>
          {saving ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
        </button>
        <div style={S.infoBox}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>ℹ️ Backend Info</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.9 }}>
            • Playlist data MySQL database এ সেভ হচ্ছে<br />
            • File upload সরাসরি database এ LONGTEXT হিসেবে<br />
            • যেকোনো device থেকে admin panel ব্যবহার করা যাবে<br />
            • API URL: <code style={S.code}>src/api.js</code> এ VITE_API_URL সেট করুন
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = {
  adminBg: { display: 'flex', height: '100vh', background: 'var(--bg-deep)', overflow: 'hidden' },
  sidebar: { width: 220, flexShrink: 0, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0' },
  sidebarLogo: { padding: '0 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  logoRed: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: 'var(--accent)' },
  logoWhite: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: 'var(--text-primary)' },
  adminBadge: { background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.3)', color: 'var(--accent)', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  nav: { flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'var(--transition)' },
  navActive: { background: 'var(--bg-hover)', color: 'var(--text-primary)' },
  logoutBtn: { margin: '0 10px 10px', padding: '10px 12px', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', fontSize: 13, textAlign: 'left' },
  mobileTopBar: {
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', height: 50,
    background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
  },
  mobileLogoutBtn: {
    padding: '6px 12px', borderRadius: 8,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', fontSize: 12,
  },
  mobileBottomNav: {
    flexShrink: 0, display: 'flex', height: 60,
    background: 'var(--bg-panel)', borderTop: '1px solid var(--border)',
    zIndex: 50,
  },
  mobileNavBtn: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 2,
    background: 'transparent', color: 'var(--text-muted)',
    fontSize: 11, fontWeight: 500,
  },
  mobileNavActive: { color: 'var(--accent)' },
  content: { flex: 1, overflowY: 'auto', padding: '28px 32px' },
  toast: { position: 'fixed', top: 20, right: 24, zIndex: 999, background: '#1a2e1a', border: '1px solid var(--live-green)', color: 'var(--live-green)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, animation: 'fadeIn 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' },
  section: { maxWidth: 820, animation: 'fadeIn 0.25s ease' },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' },
  sectionSub: { color: 'var(--text-muted)', fontSize: 13, marginTop: 2 },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' },
  spinner: { width: 36, height: 36, border: '3px solid rgba(230,57,70,0.2)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyBox: { background: 'var(--bg-panel)', border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' },
  emptyText: { color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 },
  cardGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  cardIndex: { width: 28, height: 28, borderRadius: 8, background: 'var(--bg-card)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 },
  cardDesc: { color: 'var(--text-muted)', fontSize: 12, marginTop: 2 },
  sourceBadge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, flexShrink: 0 },
  cardUrl: { color: 'var(--text-muted)', fontSize: 11, background: 'var(--bg-card)', borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all', marginBottom: 12, fontFamily: 'monospace' },
  cardActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  actionBtn: { padding: '6px 12px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 },
  actionOn: { color: 'var(--live-green)', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' },
  actionOff: { color: 'var(--accent2)', borderColor: 'rgba(244,162,97,0.3)', background: 'rgba(244,162,97,0.08)' },
  actionDanger: { color: 'var(--accent)', borderColor: 'rgba(230,57,70,0.3)', background: 'rgba(230,57,70,0.08)' },
  form: { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 },
  input: { padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, width: '100%' },
  inputHint: { color: 'var(--text-muted)', fontSize: 11, marginTop: 4 },
  sourceTabs: { display: 'flex', gap: 8 },
  sourceTab: { flex: 1, padding: '10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, transition: 'var(--transition)' },
  sourceTabActive: { background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.4)', color: 'var(--accent)' },
  dropZone: { border: '2px dashed var(--border-bright)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer' },
  dropText: { color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, marginBottom: 4 },
  dropSub: { color: 'var(--text-muted)', fontSize: 11 },
  fileSuccess: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 16px' },
  fileSuccessName: { color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 },
  fileSuccessMeta: { color: 'var(--text-muted)', fontSize: 11, marginTop: 2 },
  fileChangeBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '5px 10px', fontSize: 11, flexShrink: 0 },
  errorTxt: { color: '#ff6b7a', fontSize: 13 },
  formActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  primaryBtn: { padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  ghostBtn: { padding: '10px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, fontSize: 13, fontWeight: 500 },
  infoBox: { background: 'rgba(244,162,97,0.06)', border: '1px solid rgba(244,162,97,0.2)', borderRadius: 10, padding: 16, marginTop: 8 },
  code: { background: 'var(--bg-card)', padding: '2px 7px', borderRadius: 4, fontSize: 11, color: 'var(--accent2)', fontFamily: 'monospace' },
  loginBg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', padding: 20 },
  loginBox: { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 36, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease' },
  loginLogo: { textAlign: 'center', marginBottom: 4 },
  loginSub: { textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
  loginHint: { marginTop: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 },
};
