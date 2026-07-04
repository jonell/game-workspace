import React, { useState, useEffect, useCallback, createElement } from 'react';
import { Table, Button, Space, Modal, Input, Popconfirm, message, Tag, Typography } from 'antd';
import { ReloadOutlined, PlusOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { blacklistApi } from '../../api/blacklist';

const { Text } = Typography;

interface WhitelistEntry {
  id: string;
  processName: string;
  processPath?: string | null;
  isSystem: boolean;
}

const WhitelistPage: React.FC = () => {
  const [items, setItems] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processName, setProcessName] = useState('');
  const [processPath, setProcessPath] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await blacklistApi.getWhitelist();
      setItems(data.data ?? []);
    } catch (err: any) {
      message.error('加载白名单失败');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!processName.trim()) { message.warning('请输入进程名称'); return; }
    setSubmitting(true);
    try {
      await blacklistApi.addWhitelist({ processName: processName.trim(), processPath: processPath.trim() || undefined });
      message.success('已添加到白名单');
      setModalOpen(false);
      setProcessName('');
      setProcessPath('');
      fetchItems();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '添加失败');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await blacklistApi.removeWhitelist(id);
      message.success('已删除');
      fetchItems();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  const columns = [
    {
      title: '类型', dataIndex: 'isSystem', key: 'type', width: 80,
      render: (v: boolean) => v
        ? <Tag color="blue" icon={createElement(SafetyCertificateOutlined)}>系统内置</Tag>
        : <Tag>自定义</Tag>,
    },
    {
      title: '进程名称', dataIndex: 'processName', key: 'processName',
      render: (v: string) => <Text code style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_: unknown, record: WhitelistEntry) => {
        if (record.isSystem) return <Text type="secondary" style={{ fontSize: 12 }}>不可删除</Text>;
        return (
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={createElement(DeleteOutlined)}>删除</Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>进程白名单</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            白名单中的进程不会被关闭（优先级高于黑名单） · 系统内置条目不可删除
          </Text>
        </div>
        <Space>
          <Button icon={createElement(ReloadOutlined)} onClick={fetchItems} loading={loading}>刷新</Button>
          <Button type="primary" icon={createElement(PlusOutlined)}
            onClick={() => { setProcessName(''); setProcessPath(''); setModalOpen(true); }}>添加白名单</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={items} rowKey="id" loading={loading}
        locale={{ emptyText: '暂无白名单条目' }}
        pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }} />

      <Modal title="添加白名单进程" open={modalOpen} onOk={handleAdd}
        onCancel={() => setModalOpen(false)} confirmLoading={submitting}
        okText="添加" cancelText="取消" destroyOnClose>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
            进程名称（如 WeChat.exe、YY.exe）
          </Text>
          <Input placeholder="输入进程名称" value={processName}
            onChange={(e) => setProcessName(e.target.value)} onPressEnter={handleAdd} />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 4, display: 'block' }}>
            进程路径（可选）
          </Text>
          <Input placeholder="输入完整路径" value={processPath}
            onChange={(e) => setProcessPath(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export default WhitelistPage;
