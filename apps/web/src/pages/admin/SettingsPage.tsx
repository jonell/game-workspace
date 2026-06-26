import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Tag, Space, Typography, message, Row, Col } from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import http from '../../api/client';

const { Text } = Typography;

const SettingsPage: React.FC = () => {
  const [games, setGames] = useState<string[]>([]);
  const [ranks, setRanks] = useState<string[]>([]);
  const [newGame, setNewGame] = useState('');
  const [newRank, setNewRank] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await http.get('/settings');
      setGames(data.data?.games ?? []);
      setRanks(data.data?.ranks ?? []);
    } catch { message.error('加载配置失败'); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await http.put('/settings', { games, ranks });
      message.success('配置已保存');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const addGame = () => {
    if (!newGame.trim()) return;
    if (games.includes(newGame.trim())) { message.warning('已存在'); return; }
    setGames([...games, newGame.trim()]);
    setNewGame('');
  };

  const removeGame = (g: string) => setGames(games.filter((x) => x !== g));

  const addRank = () => {
    if (!newRank.trim()) return;
    if (ranks.includes(newRank.trim())) { message.warning('已存在'); return; }
    setRanks([...ranks, newRank.trim()]);
    setNewRank('');
  };

  const removeRank = (r: string) => setRanks(ranks.filter((x) => x !== r));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>系统设置</Text>
          <br /><Text type="secondary" style={{ fontSize: 13 }}>管理游戏列表、段位列表等可选配置项</Text>
        </div>
        <Space>
          <Button icon={React.createElement(ReloadOutlined)} onClick={fetchSettings}>刷新</Button>
          <Button type="primary" icon={React.createElement(SaveOutlined)} onClick={handleSave} loading={saving}>保存</Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="游戏列表" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="输入游戏名" value={newGame} onChange={(e) => setNewGame(e.target.value)} onPressEnter={addGame} />
                <Button type="primary" icon={React.createElement(PlusOutlined)} onClick={addGame}>添加</Button>
              </Space.Compact>
              <div style={{ marginTop: 12 }}>
                {games.map((g) => (
                  <Tag closable key={g} onClose={() => removeGame(g)} style={{ marginBottom: 8, fontSize: 13, padding: '4px 10px' }}>{g}</Tag>
                ))}
                {games.length === 0 && <Text type="secondary">暂无游戏，请添加</Text>}
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="段位列表" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="输入段位名" value={newRank} onChange={(e) => setNewRank(e.target.value)} onPressEnter={addRank} />
                <Button type="primary" icon={React.createElement(PlusOutlined)} onClick={addRank}>添加</Button>
              </Space.Compact>
              <div style={{ marginTop: 12 }}>
                {ranks.map((r) => (
                  <Tag closable key={r} onClose={() => removeRank(r)} style={{ marginBottom: 8, fontSize: 13, padding: '4px 10px' }}>{r}</Tag>
                ))}
                {ranks.length === 0 && <Text type="secondary">暂无段位，请添加</Text>}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SettingsPage;
