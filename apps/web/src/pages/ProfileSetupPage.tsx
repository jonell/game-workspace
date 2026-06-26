import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, Typography, message } from 'antd';
import http from '../api/client';
import { useAuthStore } from '../stores/authStore';

const { Text } = Typography;
const { Option } = Select;

const ProfileSetupPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [games, setGames] = useState<string[]>([]);
  const [rank, setRank] = useState('');
  const [hasAccount, setHasAccount] = useState('');
  const [gameOptions, setGameOptions] = useState<string[]>([]);
  const [rankOptions, setRankOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'COMPANION') { navigate('/login', { replace: true }); return; }
    http.get('/settings').then(({ data }) => {
      setGameOptions(data.data?.games ?? []);
      setRankOptions(data.data?.ranks ?? []);
    }).catch(() => {});
  }, [user, navigate]);

  const handleSave = async () => {
    if (games.length === 0) { message.warning('请至少选择一个游戏'); return; }
    setSaving(true);
    try {
      await http.put(`/companions/${user!.companionId}/profile`, { games, rank, hasAccount });
      message.success('资料已保存');
      window.location.href = '/';
    } catch (err: any) {
      message.error(err?.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ background: '#FFF', borderRadius: 16, padding: 40, width: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>完善陪玩资料</h2>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          请选择您擅长的游戏和相关信息
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>可接单游戏（多选）</Text>
            <Select mode="multiple" size="large" placeholder="选择游戏" value={games} onChange={(v) => setGames(v)} style={{ width: '100%' }}>
              {gameOptions.map((g) => <Option key={g} value={g}>{g}</Option>)}
            </Select>
          </div>

          <div>
            <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>最高段位</Text>
            <Select size="large" placeholder="选择段位" value={rank || undefined} onChange={(v) => setRank(v)} style={{ width: '100%' }} allowClear>
              {rankOptions.map((r) => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </div>

          <div>
            <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>有无游戏账号</Text>
            <Select size="large" placeholder="选择" value={hasAccount || undefined} onChange={(v) => setHasAccount(v)} style={{ width: '100%' }}>
              <Option value="true">有账号</Option>
              <Option value="false">无账号</Option>
            </Select>
          </div>

          <Button type="primary" size="large" block loading={saving} onClick={handleSave}
            style={{ height: 46, fontSize: 16, fontWeight: 600, borderRadius: 10, marginTop: 8,
              background: 'linear-gradient(135deg, #7B61FF, #00D4FF)', border: 'none', color: '#FFF' }}>
            💾 保存资料
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
