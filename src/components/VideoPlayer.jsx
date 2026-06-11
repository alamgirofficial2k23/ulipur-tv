import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function VideoPlayer({ channel }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const [status, setStatus]   = useState('idle');   // idle | loading | playing | error
  const [errMsg, setErrMsg]   = useState('');

  const destroy = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  useEffect(() => {
    if (!channel) return;
    const video = videoRef.current;
    if (!video) return;

    destroy();
    setStatus('loading');
    setErrMsg('');

    const url = channel.url;
    const isHLS = /\.m3u8/i.test(url) || /m3u8/i.test(url);

    const onPlaying = () => setStatus('playing');
    const onWaiting = () => setStatus('loading');
    const onError   = () => { setStatus('error'); setErrMsg('Stream unavailable.'); };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error',   onError);

    const playDirect = () => {
      video.src = url;
      video.load();
      video.play().catch(() => {});
    };

    if (isHLS) {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true, lowLatencyMode: true,
            backBufferLength: 30, maxBufferLength: 60,
            startLevel: -1,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal) {
              if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
              else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
              else { setStatus('error'); setErrMsg('Stream error. Channel may be offline.'); }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          playDirect();
        } else {
          setStatus('error'); setErrMsg('HLS not supported in this browser.');
        }
      });
    } else {
      playDirect();
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error',   onError);
      destroy();
      video.src = '';
    };
  }, [channel, destroy]);

  return (
    <div style={V.wrap}>
      {/* Overlays */}
      {!channel && (
        <div style={V.overlay}>
          <div style={V.tvEmoji}>📺</div>
          <p style={V.overlayTitle}>Channel select করুন</p>
          <p style={V.overlaySub}>নিচের list থেকে পছন্দের channel বেছে নিন</p>
        </div>
      )}
      {channel && status === 'loading' && (
        <div style={V.overlay}>
          <div style={V.spinner} />
          <p style={V.overlayTitle}>Stream লোড হচ্ছে...</p>
          <p style={V.overlaySub}>{channel.name}</p>
        </div>
      )}
      {status === 'error' && (
        <div style={V.overlay}>
          <div style={V.errIcon}>⚠</div>
          <p style={V.overlayTitle}>Stream চালানো যাচ্ছে না</p>
          <p style={V.overlaySub}>Channel offline বা geo-restricted হতে পারে</p>
        </div>
      )}

      <video
        ref={videoRef}
        style={V.video}
        controls
        autoPlay
        playsInline          // iOS এ inline play (fullscreen না গিয়ে)
        webkit-playsinline="true"  // older iOS
        x5-playsinline="true"      // WeChat/Android WebView
        muted={false}
      />
    </div>
  );
}

const V = {
  wrap: {
    position: 'relative', width: '100%', height: '100%',
    background: '#000', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  video: {
    width: '100%', height: '100%',
    display: 'block', objectFit: 'contain',
  },
  overlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(8,12,18,0.93)',
    gap: 10, padding: 20, textAlign: 'center',
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(230,57,70,0.2)',
    borderTop: '3px solid #e63946',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  tvEmoji:     { fontSize: 44, marginBottom: 4 },
  errIcon:     { fontSize: 36, color: '#e63946' },
  overlayTitle:{ color: '#e8edf3', fontSize: 15, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" },
  overlaySub:  { color: '#4a5a6b', fontSize: 12, fontFamily: "'DM Sans',sans-serif" },
};
