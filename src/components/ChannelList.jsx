import React, { useState, useMemo } from 'react';

export default function ChannelList({ channels, groups, activeChannel, onSelect }) {
  const [search, setSearch]       = useState('');
  const [activeGroup, setGroup]   = useState('All');

  const groupNames = useMemo(() => ['All', ...Object.keys(groups).sort()], [groups]);

  const filtered = useMemo(() => {
    let list = activeGroup === 'All' ? channels : (groups[activeGroup] || []);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ch => ch.name.toLowerCase().includes(q));
    }
    return list;
  }, [channels, groups, activeGroup, search]);

  return (
    <div style={C.root}>
      {/* Search bar */}
      <div style={C.searchWrap}>
        <span style={C.searchIcon}>⌕</span>
        <input
          style={C.searchInput}
          type="text"
          placeholder="Channel খুঁজুন..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button style={C.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Category tabs */}
      <div style={C.catScroll}>
        {groupNames.map(g => (
          <button
            key={g}
            style={{...C.catTab, ...(activeGroup === g ? C.catTabActive : {})}}
            onClick={() => setGroup(g)}
          >
            {g}
            <span style={C.catCount}>
              {g === 'All' ? channels.length : (groups[g]?.length || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Count row */}
      <div style={C.countRow}>
        <span style={C.countText}>{filtered.length} channels</span>
      </div>

      {/* List */}
      <div style={C.list}>
        {filtered.length === 0
          ? <div style={C.empty}>কোনো channel পাওয়া যায়নি</div>
          : filtered.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isActive={activeChannel?.id === ch.id}
                onSelect={onSelect}
              />
            ))
        }
      </div>
    </div>
  );
}

function ChannelItem({ channel, isActive, onSelect }) {
  const [imgErr, setImgErr] = useState(false);
  const initial = channel.name?.charAt(0).toUpperCase() || '?';
  const palette = ['#e63946','#f4a261','#2a9d8f','#457b9d','#9b5de5','#f15bb5'];
  const bg      = palette[channel.name.charCodeAt(0) % palette.length];

  return (
    <div
      style={{...C.item, ...(isActive ? C.itemActive : {})}}
      onClick={() => onSelect(channel)}
      // Better touch target
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(channel)}
    >
      {/* Logo */}
      <div style={C.logoWrap}>
        {channel.logo && !imgErr
          ? <img src={channel.logo} alt="" style={C.logo} onError={() => setImgErr(true)} />
          : <div style={{...C.logoFb, background: bg}}>{initial}</div>
        }
        {isActive && <div style={C.dot} />}
      </div>

      {/* Info */}
      <div style={C.info}>
        <div style={C.name}>{channel.name}</div>
        <div style={C.group}>{channel.group}</div>
      </div>

      {/* Playing indicator */}
      {isActive && <div style={C.playArrow}>▶</div>}
    </div>
  );
}

const C = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '10px 12px',
    padding: '0 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    // taller for easier mobile tap
    height: 42,
    flexShrink: 0,
  },
  searchIcon:  { color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none',
    color: 'var(--text-primary)', fontSize: 14,
    // prevent iOS zoom on focus (font-size >= 16 needed)
    WebkitTextSizeAdjust: '100%',
  },
  clearBtn: {
    background: 'none', color: 'var(--text-muted)',
    fontSize: 12, padding: '4px 6px', borderRadius: 4,
    // bigger tap target
    minWidth: 28, minHeight: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  catScroll: {
    display: 'flex', gap: 6,
    overflowX: 'auto', padding: '0 12px 10px',
    scrollbarWidth: 'none', flexShrink: 0,
    // momentum scroll on iOS
    WebkitOverflowScrolling: 'touch',
  },
  catTab: {
    flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 20,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
    whiteSpace: 'nowrap', cursor: 'pointer',
    // min height for touch
    minHeight: 34,
  },
  catTabActive: { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' },
  catCount: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 10, padding: '0 5px', fontSize: 10,
  },
  countRow: {
    padding: '4px 16px 8px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  countText: { color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  list: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 0' },
  empty: { textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: 13 },
  item: {
    display: 'flex', alignItems: 'center', gap: 10,
    // taller rows on mobile — easier to tap
    padding: '10px 14px',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    // tap highlight
    WebkitTapHighlightColor: 'rgba(230,57,70,0.15)',
    transition: 'background 0.15s',
    minHeight: 56,
  },
  itemActive: { background: 'var(--bg-hover)', borderLeftColor: 'var(--accent)' },
  logoWrap: { position: 'relative', flexShrink: 0 },
  logo: {
    width: 40, height: 40, borderRadius: 8,
    objectFit: 'contain', background: '#1a2234', padding: 2,
    display: 'block',
  },
  logoFb: {
    width: 40, height: 40, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 15,
    fontFamily: "'Bebas Neue', sans-serif",
  },
  dot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 9, height: 9,
    background: 'var(--live-green)', borderRadius: '50%',
    border: '2px solid var(--bg-panel)',
    animation: 'pulse-dot 1.5s ease infinite',
  },
  info:  { flex: 1, minWidth: 0 },
  name:  { color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  group: { color: 'var(--text-muted)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  playArrow: { color: 'var(--accent)', fontSize: 10, flexShrink: 0 },
};
