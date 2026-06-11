import React, { useState, useMemo, useCallback, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer.jsx';
import ChannelList from './components/ChannelList.jsx';
import AdminPage from './components/AdminPage.jsx';
import { parseM3U, groupChannels, fetchM3U } from './m3uParser.js';
import { getPublicPlaylists, API_BASE } from './api.js';

// ── Simple hash router ────────────────────────────────────
function useRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const h = () => setHash(window.location.hash);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return hash;
}

// ── Responsive hook ───────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function App() {
  const hash = useRoute();
  if (hash === '#/admin') return <AdminPage />;
  return <PublicApp />;
}

// ── Public TV App ─────────────────────────────────────────
function PublicApp() {
  const isMobile = useIsMobile();
  const [playlists, setPlaylists]     = useState([]);
  const [selectedPl, setSelectedPl]   = useState(null);
  const [channels, setChannels]       = useState([]);
  const [activeChannel, setActive]    = useState(null);
  const [loading, setLoading]         = useState(false);
  const [plLoading, setPlLoading]     = useState(true);
  const [error, setError]             = useState('');
  // Desktop: sidebar open/close
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile: channel drawer open/close
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const groups = useMemo(() => groupChannels(channels), [channels]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getPublicPlaylists();
        setPlaylists(list);
        if (list.length > 0) loadChannels(list[0], true);
      } catch (e) {
        setError('Server থেকে playlist লোড হয়নি: ' + e.message);
      } finally {
        setPlLoading(false);
      }
    })();
  }, []);

  const loadChannels = useCallback(async (pl, force = false) => {
    if (!force && selectedPl?.id === pl.id) return;
    setSelectedPl(pl);
    setChannels([]);
    setActive(null);
    setLoading(true);
    setError('');
    try {
      let text = '';
      if (pl.source_type === 'file') {
        const res  = await fetch(`${API_BASE}/playlist-content.php?id=${pl.id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        text = json.data.file_content;
      } else {
        text = await fetchM3U(pl.url);
      }
      const chs = parseM3U(text);
      if (!chs.length) throw new Error('Playlist এ কোনো channel নেই');
      setChannels(chs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPl]);

  const handleSelect = useCallback((ch) => {
    setActive(ch);
    setDrawerOpen(false); // mobile drawer বন্ধ হবে
  }, []);

  // ── Splash ─────────────────────────────────────────────
  if (plLoading) return (
    <div style={S.splash}>
      <Logo /><div style={S.splashSpinner} />
    </div>
  );
  if (playlists.length === 0) return (
    <div style={S.splash}>
      <Logo />
      <p style={S.splashMsg}>এখনো কোনো channel যোগ করা হয়নি।<br />Admin panel থেকে playlist যোগ করুন।</p>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────
  if (isMobile) return (
    <MobileLayout
      playlists={playlists}
      selectedPl={selectedPl}
      activeChannel={activeChannel}
      channels={channels}
      groups={groups}
      loading={loading}
      error={error}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      onSelectPlaylist={(pl) => { loadChannels(pl); setDrawerOpen(true); }}
      onSelectChannel={handleSelect}
    />
  );

  // ── Desktop layout ──────────────────────────────────────
  return (
    <div style={S.app}>
      <nav style={S.navbar}>
        <div style={S.navLeft}>
          <button style={S.menuBtn} onClick={() => setSidebarOpen(p => !p)}>
            <span style={S.mLine}/><span style={S.mLine}/><span style={{...S.mLine,width:14}}/>
          </button>
          <Logo />
        </div>
        <div style={S.plTabs}>
          {playlists.map(pl => (
            <button key={pl.id}
              style={{...S.plTab, ...(selectedPl?.id===pl.id ? S.plTabActive : {})}}
              onClick={() => loadChannels(pl)}
            >{pl.name}</button>
          ))}
        </div>
        <div style={S.navRight}>
          {activeChannel && (
            <div style={S.liveBar}>
              <span style={S.liveDot}>●</span>
              <span style={S.liveName}>{activeChannel.name}</span>
            </div>
          )}
        </div>
      </nav>

      <div style={S.body}>
        <aside style={{...S.sidebar, width: sidebarOpen?290:0, minWidth: sidebarOpen?290:0, opacity: sidebarOpen?1:0}}>
          <SideContent loading={loading} error={error} channels={channels} groups={groups} activeChannel={activeChannel} onSelect={handleSelect} />
        </aside>

        <main style={S.playerArea}>
          <div style={S.playerWrap}><VideoPlayer channel={activeChannel} /></div>
          {activeChannel && (
            <div style={S.infoBar} className="fade-in">
              <div style={{minWidth:0}}>
                <div style={S.infoName}>{activeChannel.name}</div>
                <div style={S.infoGroup}>{activeChannel.group} · {selectedPl?.name}</div>
              </div>
              <span style={S.liveTag}>● LIVE</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Mobile Layout Component ───────────────────────────────
function MobileLayout({ playlists, selectedPl, activeChannel, channels, groups, loading, error, drawerOpen, setDrawerOpen, onSelectPlaylist, onSelectChannel }) {
  return (
    <div style={MS.root}>
      {/* Top bar */}
      <div style={MS.topbar}>
        <Logo size={20} />
        {/* Playlist tabs */}
        <div style={MS.plTabs}>
          {playlists.map(pl => (
            <button key={pl.id}
              style={{...MS.plTab, ...(selectedPl?.id===pl.id ? MS.plTabActive : {})}}
              onClick={() => onSelectPlaylist(pl)}
            >{pl.name}</button>
          ))}
        </div>
      </div>

      {/* Video player */}
      <div style={MS.playerWrap}>
        <VideoPlayer channel={activeChannel} />
      </div>

      {/* Channel info strip */}
      {activeChannel ? (
        <div style={MS.infoStrip}>
          <div style={{flex:1, minWidth:0}}>
            <div style={MS.channelName}>{activeChannel.name}</div>
            <div style={MS.channelGroup}>{activeChannel.group}</div>
          </div>
          <span style={MS.liveTag}>● LIVE</span>
        </div>
      ) : (
        <div style={MS.infoStrip}>
          <span style={{color:'var(--text-muted)', fontSize:13}}>Channel select করুন</span>
        </div>
      )}

      {/* Channel list — scrollable */}
      <div style={MS.channelSection}>
        <div style={MS.channelHeader}>
          <span style={MS.channelHeaderText}>
            {loading ? 'লোড হচ্ছে...' : `${channels.length} Channels`}
          </span>
          {selectedPl && <span style={MS.playlistBadge}>{selectedPl.name}</span>}
        </div>
        <div style={MS.channelScroll}>
          <SideContent
            loading={loading} error={error}
            channels={channels} groups={groups}
            activeChannel={activeChannel}
            onSelect={onSelectChannel}
            compact
          />
        </div>
      </div>
    </div>
  );
}

// ── Sidebar/Channel content (shared) ─────────────────────
function SideContent({ loading, error, channels, groups, activeChannel, onSelect, compact }) {
  if (loading) return (
    <div style={S.sideCenter}>
      <div style={S.spinner}/>
      <p style={{color:'var(--text-muted)',fontSize:13}}>Channels লোড হচ্ছে...</p>
    </div>
  );
  if (error) return (
    <div style={S.sideCenter}>
      <div style={{fontSize:28}}>⚠</div>
      <p style={{color:'var(--text-secondary)',fontSize:12,textAlign:'center',lineHeight:1.6}}>{error}</p>
    </div>
  );
  return <ChannelList channels={channels} groups={groups} activeChannel={activeChannel} onSelect={onSelect} />;
}

// ── Logo component ────────────────────────────────────────
function Logo({ size = 24 }) {
  return (
    <div style={{display:'flex',alignItems:'baseline'}}>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:size,color:'var(--accent)',letterSpacing:'0.04em'}}>উলিপুর</span>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:size,color:'var(--text-primary)',letterSpacing:'0.04em'}}> TV</span>
    </div>
  );
}

// ── Desktop styles ────────────────────────────────────────
const S = {
  app:         { display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' },
  splash:      { height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-deep)', gap:20 },
  splashSpinner:{ width:32, height:32, border:'3px solid rgba(230,57,70,0.2)', borderTop:'3px solid var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  splashMsg:   { color:'var(--text-muted)', fontSize:14, textAlign:'center', lineHeight:1.8 },
  navbar:      { height:52, flexShrink:0, background:'var(--bg-panel)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 14px', gap:12, zIndex:50 },
  navLeft:     { display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  menuBtn:     { background:'none', padding:6, borderRadius:6, display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' },
  mLine:       { display:'block', width:18, height:2, background:'var(--text-secondary)', borderRadius:2 },
  plTabs:      { flex:1, display:'flex', alignItems:'center', gap:6, overflowX:'auto', scrollbarWidth:'none', padding:'0 4px' },
  plTab:       { flexShrink:0, padding:'6px 14px', borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:12, fontWeight:500, whiteSpace:'nowrap', transition:'var(--transition)' },
  plTabActive: { background:'var(--accent)', borderColor:'var(--accent)', color:'#fff' },
  navRight:    { flexShrink:0 },
  liveBar:     { display:'flex', alignItems:'center', gap:6, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 12px', maxWidth:180, overflow:'hidden' },
  liveDot:     { color:'var(--live-green)', fontSize:9, animation:'pulse-dot 1.5s ease infinite' },
  liveName:    { color:'var(--text-primary)', fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  body:        { flex:1, display:'flex', overflow:'hidden' },
  sidebar:     { background:'var(--bg-panel)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, transition:'width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s', overflow:'hidden' },
  sideCenter:  { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:20 },
  spinner:     { width:34, height:34, border:'3px solid rgba(230,57,70,0.2)', borderTop:'3px solid var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  playerArea:  { flex:1, display:'flex', flexDirection:'column', padding:14, gap:10, overflow:'hidden', background:'var(--bg-deep)' },
  playerWrap:  { flex:1, minHeight:0, borderRadius:12, overflow:'hidden', boxShadow:'0 4px 40px rgba(0,0,0,0.5)' },
  infoBar:     { display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 16px', flexShrink:0, gap:10 },
  infoName:    { color:'var(--text-primary)', fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  infoGroup:   { color:'var(--text-muted)', fontSize:12, marginTop:2 },
  liveTag:     { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'var(--live-green)', borderRadius:4, padding:'3px 8px', fontSize:11, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 },
};

// ── Mobile styles ─────────────────────────────────────────
const MS = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100dvh',           // dynamic viewport height (mobile browser bar aware)
    background: 'var(--bg-deep)',
    overflow: 'hidden',
  },
  topbar: {
    height: 46, flexShrink: 0,
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    padding: '0 12px', gap: 10,
  },
  plTabs: {
    flex: 1, display: 'flex', alignItems: 'center',
    gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
  },
  plTab: {
    flexShrink: 0, padding: '5px 12px', borderRadius: 16,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  plTabActive: { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' },
  playerWrap: {
    flexShrink: 0,
    // 16:9 aspect ratio
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
    overflow: 'hidden',
  },
  infoStrip: {
    flexShrink: 0,
    display: 'flex', alignItems: 'center',
    padding: '8px 14px', gap: 10,
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    minHeight: 44,
  },
  channelName: {
    color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  channelGroup: { color: 'var(--text-muted)', fontSize: 11, marginTop: 1 },
  liveTag: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    color: 'var(--live-green)', borderRadius: 4, padding: '2px 7px',
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  channelSection: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    minHeight: 0,
  },
  channelHeader: {
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)',
  },
  channelHeaderText: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  playlistBadge: {
    background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.25)',
    color: 'var(--accent)', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 600,
  },
  channelScroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
};
