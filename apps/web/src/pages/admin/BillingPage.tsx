import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Button,
  Tabs,
  Tag,
  Typography,
  Space,
  message,
  Image,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Card,
  DatePicker,
  Alert,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { TransactionStatus } from '@chunlv/shared';
import { billingApi } from '../../api/billing';
import { expenseReportsApi } from '../../api/expenses';
import dayjs, { Dayjs } from 'dayjs';

const { Text } = Typography;

const statusConfig: Record<
  TransactionStatus,
  { color: string; label: string }
> = {
  [TransactionStatus.PENDING]: { color: 'processing', label: '待审核' },
  [TransactionStatus.APPROVED]: { color: 'green', label: '已通过' },
  [TransactionStatus.REJECTED]: { color: 'error', label: '已拒绝' },
};

interface TransactionItem {
  id: string;
  orderId: string;
  companionId: string;
  amount: number;
  paymentMethod: string;
  screenshotUrl: string;
  status: TransactionStatus;
  createdAt: string;
  paidAt: string;
  order?: {
    id: string;
    type: string;
    amount: number;
    customerId: string;
  };
  companion?: {
    id: string;
    user?: {
      username: string;
    };
  };
}

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const BillingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TransactionStatus>(
    TransactionStatus.PENDING,
  );
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await billingApi.list({ status: activeTab });
      setTransactions(data.data ?? []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '加载报账列表失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleApprove = async (id: string) => {
    try {
      await billingApi.approve(id);
      message.success('审核通过');
      fetchTransactions();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '审核失败';
      message.error(msg);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await billingApi.reject(id);
      message.success('已拒绝');
      fetchTransactions();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleBatchApprove = async () => {
    const ids = selectedRowKeys as string[];
    try {
      const { data } = await billingApi.batchApprove(ids);
      const result = data.data;
      message.success(data.message || `批量通过：成功 ${result?.succeeded ?? ids.length} 条`);
      setSelectedRowKeys([]);
      fetchTransactions();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '批量操作失败';
      message.error(msg);
    }
  };

  const handleBatchReject = async () => {
    const ids = selectedRowKeys as string[];
    try {
      const { data } = await billingApi.batchReject(ids);
      const result = data.data;
      message.success(data.message || `批量拒绝：成功 ${result?.succeeded ?? ids.length} 条`);
      setSelectedRowKeys([]);
      fetchTransactions();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '批量操作失败';
      message.error(msg);
    }
  };

  // ── Expense Reports ──
  const [reports, setReports] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ── Wallet Transactions ──
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [walletTxnsLoading, setWalletTxnsLoading] = useState(false);
  const [walletTxnsFilter, setWalletTxnsFilter] = useState<string>('');

  // ── Monthly Settlement ──
  const [settlementMonth, setSettlementMonth] = useState<Dayjs>(dayjs());
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementResult, setSettlementResult] = useState<any>(null);
  const [pastSettlements, setPastSettlements] = useState<any[]>([]);
  const [pastSettlementsLoading, setPastSettlementsLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const { data } = await expenseReportsApi.list({ status: reportFilter || undefined });
      setReports(data.data ?? []);
    } catch { message.error('加载报账记录失败'); }
    finally { setReportsLoading(false); }
  }, [reportFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    expenseReportsApi.monthlySummary().then(({ data }) => setSummary(data.data)).catch(() => {});
  }, []);

  const fetchWalletTxns = useCallback(async () => {
    setWalletTxnsLoading(true);
    try {
      const { data } = await billingApi.walletTransactions({ status: walletTxnsFilter || undefined });
      setWalletTxns(data.data ?? []);
    } catch { message.error('加载钱包交易失败'); }
    finally { setWalletTxnsLoading(false); }
  }, [walletTxnsFilter]);

  useEffect(() => { fetchWalletTxns(); }, [fetchWalletTxns]);

  const handleWalletReview = async (id: string, status: string) => {
    try {
      await billingApi.reviewWalletTransaction(id, status);
      message.success(status === 'APPROVED' ? '已通过' : '已驳回');
      fetchWalletTxns();
    } catch { message.error('操作失败'); }
  };

  const handleRunSettlement = async () => {
    const monthStr = settlementMonth.format('YYYY-MM');
    setSettlementLoading(true);
    try {
      const { data } = await billingApi.runSettlement(monthStr);
      setSettlementResult(data.data);
      message.success(data.message || '月底结算完成');
      fetchPastSettlements();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '结算失败';
      message.error(msg);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchPastSettlements = useCallback(async () => {
    const monthStr = settlementMonth.format('YYYY-MM');
    setPastSettlementsLoading(true);
    try {
      const { data } = await billingApi.getSettlement(monthStr);
      setPastSettlements(data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setPastSettlementsLoading(false);
    }
  }, [settlementMonth]);

  useEffect(() => {
    fetchPastSettlements();
  }, [fetchPastSettlements]);

  const handleReview = async (id: string, status: string) => {
    try {
      await expenseReportsApi.review(id, status);
      message.success(status === 'APPROVED' ? '已通过' : '已驳回');
      fetchReports();
    } catch { message.error('操作失败'); }
  };

  const pendingCount = transactions.filter(
    (t) => t.status === TransactionStatus.PENDING,
  ).length;
  const approvedCount = transactions.filter(
    (t) => t.status === TransactionStatus.APPROVED,
  ).length;
  const rejectedCount = transactions.filter(
    (t) => t.status === TransactionStatus.REJECTED,
  ).length;

  const columns = [
    {
      title: '陪玩',
      key: 'companion',
      width: 100,
      render: (_: unknown, record: TransactionItem) => (
        <Text>{record.companion?.user?.username ?? '-'}</Text>
      ),
    },
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 160,
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (val: number) => (
        <Text strong style={{ color: '#cf1322' }}>
          ¥{val.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 110,
      render: (val: string) => val || '-',
    },
    {
      title: '截图',
      dataIndex: 'screenshotUrl',
      key: 'screenshotUrl',
      width: 100,
      render: (url: string) =>
        url ? (
          <Image src={url} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Text type="secondary">无</Text>
        ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 160,
      render: (val: string) => formatDate(val),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => formatDate(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: TransactionStatus) => {
        const cfg = statusConfig[status];
        return <Tag color={cfg?.color}>{cfg?.label ?? status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: TransactionItem) => {
        if (record.status !== TransactionStatus.PENDING) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space size="small">
            <Popconfirm
              title="确认通过该报账？"
              onConfirm={() => handleApprove(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small">
                通过
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认拒绝该报账？"
              onConfirm={() => handleReject(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                拒绝
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: TransactionStatus.PENDING,
      label: (
        <span>
          待审核
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, color: '#1677ff' }}>
              ({pendingCount})
            </span>
          )}
        </span>
      ),
    },
    {
      key: TransactionStatus.APPROVED,
      label: (
        <span>
          已通过
          {approvedCount > 0 && (
            <span style={{ marginLeft: 6, color: '#52c41a' }}>
              ({approvedCount})
            </span>
          )}
        </span>
      ),
    },
    {
      key: TransactionStatus.REJECTED,
      label: (
        <span>
          已拒绝
          {rejectedCount > 0 && (
            <span style={{ marginLeft: 6, color: '#ff4d4f' }}>
              ({rejectedCount})
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="待审核"
              value={pendingCount}
              prefix={React.createElement(ClockCircleOutlined)}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="已通过"
              value={approvedCount}
              prefix={React.createElement(CheckCircleOutlined)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="已拒绝"
              value={rejectedCount}
              prefix={React.createElement(CloseCircleOutlined)}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          报账审核
        </Text>
        <Button
          icon={React.createElement(ReloadOutlined)}
          onClick={fetchTransactions}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* Tabs + Table */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setSelectedRowKeys([]);
          setActiveTab(key as TransactionStatus);
        }}
        items={tabItems}
      />

      {/* Batch action bar */}
      {selectedRowKeys.length > 0 && activeTab === TransactionStatus.PENDING && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: '#e6f4ff',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text>
            已选择 <strong>{selectedRowKeys.length}</strong> 条记录
          </Text>
          <Popconfirm
            title={`确认批量通过 ${selectedRowKeys.length} 条报账？`}
            onConfirm={handleBatchApprove}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" size="small">
              批量通过
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`确认批量拒绝 ${selectedRowKeys.length} 条报账？`}
            onConfirm={handleBatchReject}
            okText="确定"
            cancelText="取消"
          >
            <Button danger size="small">
              批量拒绝
            </Button>
          </Popconfirm>
          <Button size="small" onClick={() => setSelectedRowKeys([])}>
            取消选择
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={transactions}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无报账记录' }}
        rowSelection={
          activeTab === TransactionStatus.PENDING
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
            : undefined
        }
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条报账`,
        }}
      />

      {/* ── Expense Report Review ── */}
      <Card title="💰 报账与财务" style={{ marginTop: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="本月报账" value={`¥${(summary?.totalExpense ?? 0).toFixed(2)}`} /></Col>
          <Col span={6}><Statistic title="已通过" value={`¥${((summary?.totalExpense ?? 0) + (summary?.totalWithdraw ?? 0)).toFixed(2)}`}
            valueStyle={{ color: '#3f8600' }} /></Col>
          <Col span={6}><Statistic title="待审核" value={`${summary?.pendingCount ?? 0}笔`}
            valueStyle={{ color: '#faad14' }} /></Col>
          <Col span={6}><Statistic title="已驳回" value={`${summary?.rejectedCount ?? 0}笔`}
            valueStyle={{ color: '#cf1322' }} /></Col>
        </Row>

        <Tabs activeKey={reportFilter} onChange={setReportFilter}
          items={[
            { key: '', label: '全部' },
            { key: 'PENDING', label: '待审核' },
            { key: 'APPROVED', label: '已通过' },
            { key: 'REJECTED', label: '已驳回' },
          ]}
        />
        <Table dataSource={reports} pagination={{ pageSize: 10 }} size="small" rowKey="id" loading={reportsLoading}
          locale={{ emptyText: '暂无报账申请' }}
        >
          <Table.Column title="报账人" dataIndex={['companion', 'user', 'username']} />
          <Table.Column title="类型" dataIndex="type"
            render={(t: string) => t === 'EXPENSE' ? '报账' : '支取'} />
          <Table.Column title="金额" dataIndex="amount" render={(v: number) => `¥${v.toFixed(2)}`} />
          <Table.Column title="备注" dataIndex="description" ellipsis render={(v: string) => v || '-'} />
          <Table.Column title="状态" dataIndex="status"
            render={(s: string) => {
              const m: Record<string, { color: string; label: string }> = {
                PENDING: { color: 'orange', label: '待审核' },
                APPROVED: { color: 'green', label: '已通过' },
                REJECTED: { color: 'red', label: '已驳回' },
              };
              return <Tag color={m[s]?.color}>{m[s]?.label ?? s}</Tag>;
            }} />
          <Table.Column title="日期" dataIndex="createdAt"
            render={(d: string) => new Date(d).toLocaleDateString()} />
          <Table.Column title="操作" render={(_: any, r: any) =>
            r.status === 'PENDING' ? (
              <Space>
                <Button size="small" type="primary" onClick={() => handleReview(r.id, 'APPROVED')}>通过</Button>
                <Button size="small" danger onClick={() => handleReview(r.id, 'REJECTED')}>驳回</Button>
              </Space>
            ) : <Text type="secondary">—</Text>
          } />
        </Table>
      </Card>

      {/* ── Monthly Settlement ── */}
      <Card title="📅 月底结算" style={{ marginTop: 16 }}>
        <Alert
          message="结算后陪玩当月业绩将清零并计入可支取余额，请确认当月订单已全部审核完毕。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <DatePicker
              picker="month"
              value={settlementMonth}
              onChange={(d) => {
                if (d) {
                  setSettlementMonth(d);
                  setSettlementResult(null);
                }
              }}
              style={{ width: 160 }}
              allowClear={false}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleRunSettlement}
              loading={settlementLoading}
              danger
            >
              执行结算
            </Button>
          </Col>
        </Row>

        {/* Settlement result summary */}
        {settlementResult && (
          <Card
            size="small"
            style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}
          >
            <Descriptions column={3} size="small">
              <Descriptions.Item label="结算月份">
                {settlementResult.month}
              </Descriptions.Item>
              <Descriptions.Item label="结算人数">
                {settlementResult.results?.length ?? 0} 人
              </Descriptions.Item>
              <Descriptions.Item label="总计分配">
                <Text strong style={{ color: '#cf1322' }}>
                  ¥{(settlementResult.totalDistributed ?? 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={settlementResult.results ?? []}
              rowKey="companionId"
              size="small"
              pagination={false}
              style={{ marginTop: 8 }}
              locale={{ emptyText: '暂无结算结果' }}
            >
              <Table.Column title="陪玩" dataIndex="companionName" width={100} />
              <Table.Column
                title="当月业绩"
                dataIndex="monthlyRevenue"
                width={110}
                render={(v: number) => (
                  <Text strong>¥{v.toFixed(2)}</Text>
                )}
              />
              <Table.Column
                title="分成比例"
                dataIndex="tierCompanionPct"
                width={90}
                render={(v: number) => `${v}%`}
              />
              <Table.Column
                title="陪玩分成"
                dataIndex="companionShare"
                width={110}
                render={(v: number) => (
                  <Text style={{ color: '#3f8600' }}>¥{v.toFixed(2)}</Text>
                )}
              />
              <Table.Column
                title="工作室分成"
                dataIndex="studioShare"
                width={110}
                render={(v: number) => (
                  <Text style={{ color: '#1677ff' }}>¥{v.toFixed(2)}</Text>
                )}
              />
            </Table>
          </Card>
        )}

        {/* Past settlements for selected month */}
        <Table
          dataSource={pastSettlements}
          rowKey="id"
          size="small"
          loading={pastSettlementsLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '该月暂无结算记录' }}
        >
          <Table.Column
            title="陪玩"
            dataIndex={['companion', 'user', 'username']}
            width={100}
          />
          <Table.Column
            title="金额"
            dataIndex="amount"
            width={100}
            render={(v: number) => (
              <Text strong style={{ color: '#3f8600' }}>
                ¥{v.toFixed(2)}
              </Text>
            )}
          />
          <Table.Column
            title="备注"
            dataIndex="note"
            ellipsis
            render={(v: string) => v || '-'}
          />
          <Table.Column
            title="日期"
            dataIndex="createdAt"
            width={160}
            render={(d: string) => new Date(d).toLocaleString('zh-CN')}
          />
        </Table>
      </Card>

      {/* ── Wallet Transaction Review ── */}
      <Card title="💳 钱包审核" style={{ marginTop: 16 }}>
        <Tabs activeKey={walletTxnsFilter} onChange={setWalletTxnsFilter}
          items={[
            { key: '', label: '全部' },
            { key: 'PENDING', label: '待审核' },
            { key: 'APPROVED', label: '已通过' },
            { key: 'REJECTED', label: '已驳回' },
          ]}
        />
        <Table dataSource={walletTxns} pagination={{ pageSize: 10 }} size="small" rowKey="id" loading={walletTxnsLoading}
          locale={{ emptyText: '暂无钱包交易记录' }}
        >
          <Table.Column title="陪玩" dataIndex={['companion', 'user', 'username']} width={100} />
          <Table.Column title="类型" dataIndex="type" width={90}
            render={(t: string) => {
              const labels: Record<string, { color: string; text: string }> = {
                DEPOSIT: { color: 'blue', text: '充值' },
                WITHDRAW: { color: 'orange', text: '支取' },
                FREEZE: { color: 'red', text: '冻结' },
                UNFREEZE: { color: 'green', text: '解冻' },
                SETTLEMENT: { color: 'purple', text: '结算' },
              };
              return <Tag color={labels[t]?.color}>{labels[t]?.text ?? t}</Tag>;
            }} />
          <Table.Column title="金额" dataIndex="amount" width={90}
            render={(v: number) => <Text strong style={{ color: '#cf1322' }}>¥{v.toFixed(2)}</Text>} />
          <Table.Column title="状态" dataIndex="status" width={90}
            render={(s: string) => {
              const m: Record<string, { color: string; label: string }> = {
                PENDING: { color: 'orange', label: '待审核' },
                APPROVED: { color: 'green', label: '已通过' },
                REJECTED: { color: 'red', label: '已驳回' },
              };
              return <Tag color={m[s]?.color}>{m[s]?.label ?? s}</Tag>;
            }} />
          <Table.Column title="日期" dataIndex="createdAt" width={160}
            render={(d: string) => new Date(d).toLocaleString('zh-CN')} />
          <Table.Column title="备注" dataIndex="note" ellipsis
            render={(v: string) => v || '-'} />
          <Table.Column title="操作"
            render={(_: any, r: any) =>
              r.status === 'PENDING' ? (
                <Space>
                  <Button size="small" type="primary" onClick={() => handleWalletReview(r.id, 'APPROVED')}>通过</Button>
                  <Button size="small" danger onClick={() => handleWalletReview(r.id, 'REJECTED')}>驳回</Button>
                </Space>
              ) : <Text type="secondary">—</Text>
            } />
        </Table>
      </Card>
    </div>
  );
};

export default BillingPage;
