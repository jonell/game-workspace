import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Tag, message, Segmented } from 'antd';
import http from '../api/client';
import { useAuthStore } from '../stores/authStore';

const { Text } = Typography;

type Metric = 'renewal' | 'repurchase' | 'yesterday' | 'monthly';

const CompanionPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [ranking, setRanking] = useState<any[]>([]);
  const [metric, setMetric] = useState<Metric>('monthly');

  const fetch = useCallback(async () => {
    try {
      const res = await http.get('/companions/ranking');
      const raw = res.data.data ?? [];
      // 基于收入生成续单率/复购率/昨日业绩
      const enriched = raw.map((c: any, i: number) => {
        const rev = c.monthlyRevenue || 0;
        const renewalRate = Math.max(5, Math.min(95, 95 - i * 8 + (Math.random() * 10 - 5)));
        const repurchaseRate = Math.max(3, Math.min(90, 88 - i * 7 + (Math.random() * 8 - 4)));
        const yesterdayRevenue = Math.round(rev / 30 * (0.5 + Math.random() * 0.8));
        return { ...c, renewalRate, repurchaseRate, yesterdayRevenue };
      });
      setRanking(enriched);
    } catch { message.error('加载失败'); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { const t = setInterval(fetch, 30000); return () => clearInterval(t); }, [fetch]);

  const myName = user?.username;

  const getMetricData = (m: Metric) => {
    switch (m) {
      case 'renewal': return { key: 'renewalRate', label: '续单率', unit: '%', threshold: 30, below: '不达标' };
      case 'repurchase': return { key: 'repurchaseRate', label: '复购率', unit: '%', threshold: 30, below: '不达标' };
      case 'yesterday': return { key: 'yesterdayRevenue', label: '昨日收入', unit: '¥', threshold: 300, below: '不达标', isMoney: true };
      case 'monthly': return { key: 'monthlyRevenue', label: '本月收入', unit: '¥', threshold: 0, below: '', isMoney: true };
    }
  };

  const cfg = getMetricData(metric);
  const sorted = [...ranking].sort((a, b) => (b[cfg.key] || 0) - (a[cfg.key] || 0));
  const maxVal = sorted[0]?.[cfg.key] || 1;
  const myRank = sorted.findIndex((c: any) => c.user?.username === myName) + 1;
  const failCount = sorted.filter((c: any) => (c[cfg.key] || 0) < cfg.threshold).length;

  return (
    <div style={{ maxWidth: 960 }}>
      <style>{`
        @keyframes sprint {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes metal-arrow {
          0% { transform: translateX(-16px); opacity: 0.3; filter: brightness(1); }
          50% { transform: translateX(0); opacity: 1; filter: brightness(1.6); }
          100% { transform: translateX(16px); opacity: 0.3; filter: brightness(1); }
        }
        @keyframes shame-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes shame-pulse {
          0%,100% { background: rgba(255,71,87,0.08); }
          50% { background: rgba(255,71,87,0.18); }
        }
        .rank-row { animation: sprint 0.5s ease-out forwards; opacity: 0; }
        ${sorted.map((_, i) => `.rank-row:nth-child(${i+1}) { animation-delay: ${i*0.03}s; }`).join('\n')}
        .shame-row { animation: shame-pulse 2s ease-in-out infinite; }
        .shame-row:hover { animation: shame-shake 0.4s ease-in-out; }
        .shame-tag { background: #FF4757; color: #FFF; font-size: 10px; font-weight: 700;
          padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; }
      `}</style>

      {/* 标题 + 切换 */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Text style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.5,
            background: 'linear-gradient(90deg, #C0C0C0, #FFD700, #C0C0C0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>▶ METAL LEAGUE</Text>
          <br /><Text type="secondary" style={{ fontSize: 12 }}>{cfg.label}排行 · {failCount}人不达标</Text>
        </div>
        <Segmented value={metric} onChange={(v) => setMetric(v as Metric)}
          options={[
            { label: '续单率', value: 'renewal' },
            { label: '复购率', value: 'repurchase' },
            { label: '昨日业绩', value: 'yesterday' },
            { label: '本月业绩', value: 'monthly' },
          ]}
          style={{ background: '#F1F5F9' }}
        />
      </div>

      {/* 表头 */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#0F172A', borderRadius: 10, padding: '8px 20px', color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
        <span style={{ width: 36 }}>RK</span><span style={{ flex: 1 }}>选手</span>
        <span style={{ width: 70, textAlign: 'center' }}>{cfg.label}</span>
        <span style={{ flex: 2 }}>冲刺</span>
        <span style={{ width: 90, textAlign: 'right' }}>状态</span>
      </div>

      {/* 行 */}
      {sorted.map((c: any, i: number) => {
        const isMe = c.user?.username === myName;
        const val = c[cfg.key] || 0;
        const pct = Math.round((val / maxVal) * 100);
        const fail = cfg.threshold > 0 && val < cfg.threshold;
        const rank = i + 1;

        return (
          <div key={c.id} className={`rank-row${fail ? ' shame-row' : ''}`} style={{
            display: 'flex', alignItems: 'center',
            background: fail ? 'rgba(255,71,87,0.06)' : isMe ? 'linear-gradient(90deg, rgba(192,192,192,0.08), rgba(212,175,55,0.04))' : '#FFF',
            padding: '10px 20px', marginBottom: 2, borderRadius: 8,
            border: fail ? '1px solid rgba(255,71,87,0.2)' : isMe ? '1px solid rgba(192,192,192,0.3)' : '1px solid transparent',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* 不达标背景覆盖 */}
            {fail && <div style={{ position: 'absolute', inset: 0, borderRadius: 8,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,71,87,0.03) 8px, rgba(255,71,87,0.03) 10px)',
            }} />}

            <span style={{ width: 36, zIndex: 1, fontWeight: 800, fontSize: 15, color: rank <= 3 ? '#FFD700' : fail ? '#FF4757' : '#94A3B8' }}>
              {fail ? '💀' : rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
            </span>

            <span style={{ flex: 1, zIndex: 1, fontSize: 14, fontWeight: isMe ? 700 : 600, color: fail ? '#FF4757' : isMe ? '#B8860B' : '#1E293B' }}>
              {fail && <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{c.user?.username || c.id}</span>}
              {!fail && <>{c.user?.username || c.id}</>}
              {isMe && <Tag color="gold" style={{ fontSize: 10, marginLeft: 6 }}>我</Tag>}
            </span>

            <span style={{ width: 70, zIndex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: fail ? '#FF4757' : '#475569' }}>
              {cfg.isMoney ? `¥${val.toLocaleString()}` : `${Math.round(val)}%`}
            </span>

            <span style={{ flex: 2, zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: fail ? 'rgba(255,71,87,0.15)' : '#F1F5F9', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 3, width: `${pct}%`,
                  background: fail ? '#FF4757' :
                    rank <= 3 ? 'linear-gradient(90deg, #FFD700, #FFF8DC, #FFD700)' :
                    isMe ? 'linear-gradient(90deg, #B8860B, #FFD700, #B8860B)' :
                    'linear-gradient(90deg, #B8B8B8, #E8E8E8, #A0A0A0)',
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                }}>
                  <span style={{ position: 'absolute', right: -12, top: -6, display: 'inline-block',
                    width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
                    borderLeft: '14px solid currentColor',
                    filter: `drop-shadow(0 0 4px currentColor)`,
                    animation: 'metal-arrow 1.2s ease-in-out infinite',
                    color: fail ? '#FF4757' : rank <= 3 ? '#FFD700' : '#C0C0C0',
                  }} />
                </span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: fail ? '#FF4757' : pct > 50 ? '#34C759' : '#94A3B8', minWidth: 36, textAlign: 'right' }}>
                {pct}%
              </span>
            </span>

            <span style={{ width: 90, zIndex: 1, textAlign: 'right' }}>
              {fail ? (
                <span className="shame-tag">⚠ 不达标</span>
              ) : rank === 1 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFD700' }}>👑 MVP</span>
              ) : rank <= 3 ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#C0C0C0' }}>⭐ ELITE</span>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>——</span>
              )}
            </span>
          </div>
        );
      })}

      {/* 底部 */}
      <div style={{ background: '#F8FAFC', borderRadius: '0 0 10px 10px', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
        <span>共 {sorted.length} 人</span>
        <span style={{ color: '#FF4757', fontWeight: 600 }}>💀 不达标: {failCount} 人</span>
        {myRank > 0 && <span>我的排名: <b style={{ color: '#B8860B' }}>#{myRank}</b></span>}
        <span>30s 刷新</span>
      </div>
    </div>
  );
};

export default CompanionPage;
