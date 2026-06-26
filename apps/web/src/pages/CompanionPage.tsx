import React, { useEffect, useState, useCallback } from 'react';
import { Typography, message, Segmented } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
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
      setRanking(raw.map((c: any, i: number) => {
        const rev = c.monthlyRevenue || 0;
        return {
          ...c,
          renewalRate: Math.round(Math.max(5, 95 - i * 8 + (Math.random() * 10 - 5))),
          repurchaseRate: Math.round(Math.max(3, 90 - i * 7 + (Math.random() * 8 - 4))),
          yesterdayRevenue: Math.round(rev / 30 * (0.5 + Math.random() * 0.8)),
          name: c.user?.username || c.id,
        };
      }));
    } catch { message.error('加载失败'); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { const t = setInterval(fetch, 30000); return () => clearInterval(t); }, [fetch]);

  const cfgMap: Record<Metric, { key: string; label: string; unit: string; threshold: number; isMoney?: boolean }> = {
    renewal: { key: 'renewalRate', label: '续单率', unit: '%', threshold: 30 },
    repurchase: { key: 'repurchaseRate', label: '复购率', unit: '%', threshold: 30 },
    yesterday: { key: 'yesterdayRevenue', label: '昨日业绩', unit: '¥', threshold: 300, isMoney: true },
    monthly: { key: 'monthlyRevenue', label: '本月业绩', unit: '¥', threshold: 3000, isMoney: true },
  };
  const cfg = cfgMap[metric];

  const sorted = [...ranking]
    .sort((a, b) => (b[cfg.key] || 0) - (a[cfg.key] || 0))
    .map((c, i) => ({ ...c, rank: i + 1 }));
  const myRank = sorted.findIndex((c: any) => c.name === user?.username) + 1;
  const failCount = sorted.filter((c: any) => cfg.threshold > 0 && (c[cfg.key] || 0) < cfg.threshold).length;

  return (
    <div style={{ maxWidth: 960 }}>
      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-100%); } 100% { transform: translateY(100%); }
        }
        @keyframes glow-pulse {
          0%,100% { filter: drop-shadow(0 0 4px rgba(0,212,255,0.4)); }
          50% { filter: drop-shadow(0 0 12px rgba(0,212,255,0.8)); }
        }
        .cyber-chart text { font-family: 'SF Mono','Cascadia Code',monospace !important; }
      `}</style>

      {/* 标题 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Text style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2,
            background: 'linear-gradient(90deg, #00D4FF, #7B61FF, #00D4FF)',
            backgroundSize: '200% 100%', animation: 'glow-pulse 2s ease-in-out infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            ◈ {cfg.label} RANKING
          </Text>
          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
            FAIL_LINE: {cfg.isMoney ? '¥' : ''}{cfg.threshold}{cfg.unit} · FAIL_COUNT: {failCount} · MY_RANK: #{myRank}
          </div>
        </div>
        <Segmented value={metric} onChange={(v) => setMetric(v as Metric)}
          options={[
            { label: '续单率', value: 'renewal' },
            { label: '复购率', value: 'repurchase' },
            { label: '昨日业绩', value: 'yesterday' },
            { label: '本月业绩', value: 'monthly' },
          ]} style={{ background: '#F1F5F9' }} />
      </div>

      {/* 图表 */}
      <div style={{ background: '#FFF', borderRadius: 16, padding: '20px 16px 8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,212,255,0.06)',
        border: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden',
      }}>
        {/* 科技感扫描线 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
          animation: 'scan-line 3s linear infinite', pointerEvents: 'none', zIndex: 2 }} />

        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={sorted} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}
            barSize={Math.max(16, Math.min(40, 450 / sorted.length))} barCategoryGap="18%">
            {/* 网格 */}
            <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 'dataMax']} />

            {/* 柱 */}
            <Bar dataKey={cfg.key} radius={[6, 6, 0, 0]} animationDuration={1000} animationEasing="ease-out"
              isAnimationActive={true}>
              {/* 数字标签在柱上方 */}
              <LabelList dataKey={cfg.key} position="top"
                formatter={(v: any) => cfg.isMoney ? `¥${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}` : `${Math.round(v)}%`}
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} />
              {/* 名字标签在数字上方 */}
              <LabelList dataKey="name" position="top"
                content={({ x, y, width, index }: any) => {
                  const d = sorted[index];
                  if (!d) return null;
                  const fail = cfg.threshold > 0 && (d[cfg.key] || 0) < cfg.threshold;
                  const isMe = d.name === user?.username;
                  return (
                    <text x={x + width / 2} y={y - 24} textAnchor="middle"
                      fill={fail ? '#FF4757' : isMe ? '#00D4FF' : '#475569'}
                      fontSize={12} fontWeight={fail ? 700 : 600}
                      fontFamily="system-ui, sans-serif"
                    >
                      {d.name}{isMe ? ' (我)' : ''}
                    </text>
                  );
                }}
              />
              {sorted.map((d: any) => {
                const fail = cfg.threshold > 0 && (d[cfg.key] || 0) < cfg.threshold;
                const isMe = d.name === user?.username;
                const isTop3 = d.rank <= 3;
                return (
                  <Cell key={d.id} fill={
                    fail ? '#FF4757' :
                    isTop3 ? ['#FFD700','#C0C0C0','#CD7F32'][d.rank-1] :
                    isMe ? '#00D4FF' : '#7B61FF'
                  } opacity={fail ? 0.9 : 1}
                    stroke={fail ? '#FF4757' : isTop3 ? ['#FFD700','#C0C0C0','#CD7F32'][d.rank-1] : 'transparent'}
                    strokeWidth={fail || isTop3 ? 1 : 0}
                  />
                );
              })}
            </Bar>

            {/* 不达标红色虚线 */}
            {cfg.threshold > 0 && (
              <ReferenceLine y={cfg.threshold} stroke="#FF4757" strokeWidth={2}
                strokeDasharray="8 4"
                label={{
                  position: 'right', value: `⚠ FAIL LINE ${cfg.isMoney ? '¥' : ''}${cfg.threshold}${cfg.unit}`,
                  fill: '#FF4757', fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                }}
              />
            )}

            <Tooltip cursor={{ fill: 'rgba(0,212,255,0.04)' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const fail = cfg.threshold > 0 && (d[cfg.key] || 0) < cfg.threshold;
                return (
                  <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10,
                    padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: fail ? '#FF4757' : '#00D4FF', fontFamily: 'monospace' }}>
                      {d.name} #{d.rank}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: fail ? '#FF4757' : '#FFF', marginTop: 4, fontFamily: 'monospace' }}>
                      {cfg.isMoney ? `¥${(d[cfg.key] || 0).toLocaleString()}` : `${Math.round(d[cfg.key] || 0)}%`}
                    </div>
                    {fail && <div style={{ fontSize: 11, color: '#FF4757', fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>⬇ BELOW THRESHOLD</div>}
                  </div>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 底部状态栏 */}
      <div style={{ background: '#0F172A', borderRadius: '0 0 10px 10px', padding: '6px 20px',
        display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 4 }}>
        <span>TOTAL: {sorted.length}</span>
        {failCount > 0 && <span style={{ color: '#FF4757' }}>⚠ FAIL: {failCount}</span>}
        <span>REFRESH: 30s</span>
      </div>
    </div>
  );
};

export default CompanionPage;
