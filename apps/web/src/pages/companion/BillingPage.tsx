import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, message, Statistic, Row, Col, Card, Modal, InputNumber, Space, Input } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import http from '../../api/client';
import { expenseReportsApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const BillingPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // ── Expense Reports ──
  const [reportModal, setReportModal] = useState(false);
  const [reportType, setReportType] = useState<'EXPENSE' | 'WITHDRAW'>('EXPENSE');
  const [reportAmount, setReportAmount] = useState<number>(0);
  const [reportDesc, setReportDesc] = useState('');
  const [expenseReports, setExpenseReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchExpenseReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const { data } = await expenseReportsApi.list();
      setExpenseReports(data.data ?? []);
    } catch { /* ignore */ }
    finally { setReportsLoading(false); }
  }, []);

  useEffect(() => { fetchExpenseReports(); }, [fetchExpenseReports]);

  const submitReport = async () => {
    if (reportAmount <= 0) { message.warning('请输入金额'); return; }
    try {
      await expenseReportsApi.create({
        type: reportType,
        amount: reportAmount,
        description: reportDesc,
      });
      message.success('提交成功');
      setReportModal(false);
      setReportAmount(0);
      setReportDesc('');
      fetchExpenseReports();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '提交失败');
    }
  };

  const fetchTransactions = useCallback(async () => {
    if (!user?.companionId) return;
    setLoading(true);
    try {
      const { data } = await http.get(`/companions/${user.companionId}/revenue`);
      setTransactions(data.data?.transactions ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }, [user?.companionId]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div><Text strong style={{ fontSize: 16 }}>报账系统</Text><br /><Text type="secondary">查看已提交的报账记录和审核状态</Text></div>
        <Button icon={React.createElement(ReloadOutlined)} onClick={fetchTransactions} loading={loading}>刷新</Button>
      </div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="报账总数" value={transactions.length} valueStyle={{ color: '#007AFF' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="已通过" value={transactions.filter((t: any) => t.status === 'APPROVED').length} valueStyle={{ color: '#34C759' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="总收入" value={`¥${total.toFixed(2)}`} valueStyle={{ color: '#FF4757' }} /></Card></Col>
      </Row>
      <Table size="small" dataSource={transactions} rowKey="id" loading={loading}
        columns={[
          { title: '订单号', dataIndex: ['order', 'id'], width: 100, render: (v: string) => v?.slice(0, 8) },
          { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => <span style={{ color: '#FF4757', fontWeight: 600 }}>¥{v?.toFixed(2)}</span> },
          { title: '支付方式', dataIndex: 'paymentMethod', width: 100 },
          { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'gold'}>{s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已拒绝' : '待审核'}</Tag> },
          { title: '提交时间', dataIndex: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
        ]}
      />

      {/* ── Expense Reports ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div><Text strong style={{ fontSize: 16 }}>报账/支取申请</Text><br /><Text type="secondary">提交消费报账或支取申请，由管理员审核</Text></div>
        </div>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => { setReportType('EXPENSE'); setReportModal(true); }}>
            💰 报账
          </Button>
          <Button onClick={() => { setReportType('WITHDRAW'); setReportModal(true); }}>
            💸 申请支取
          </Button>
        </Space>

        <Table size="small" dataSource={expenseReports} rowKey="id" loading={reportsLoading}
          locale={{ emptyText: '暂无申请记录' }}
          columns={[
            { title: '类型', dataIndex: 'type', width: 80, render: (t: string) => t === 'EXPENSE' ? '报账' : '支取' },
            { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => <Text strong style={{ color: '#cf1322' }}>¥{v?.toFixed(2)}</Text> },
            { title: '备注', dataIndex: 'description', ellipsis: true, render: (v: string) => v || '-' },
            { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'gold'}>{s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审核'}</Tag> },
            { title: '审核备注', dataIndex: 'reviewNote', ellipsis: true, render: (v: string) => v || '-' },
            { title: '提交时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
          ]}
        />

        <Modal
          title={reportType === 'EXPENSE' ? '💰 报账' : '💸 申请支取'}
          open={reportModal}
          onOk={submitReport}
          onCancel={() => setReportModal(false)}
          okText="提交"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>金额（元）</Text>
              <InputNumber style={{ width: '100%' }} min={0} value={reportAmount}
                onChange={v => setReportAmount(v ?? 0)} />
            </div>
            <div>
              <Text>备注</Text>
              <Input.TextArea value={reportDesc} onChange={e => setReportDesc(e.target.value)}
                placeholder="可选：填写备注信息" rows={3} />
            </div>
          </Space>
        </Modal>
      </div>
    </div>
  );
};

export default BillingPage;
