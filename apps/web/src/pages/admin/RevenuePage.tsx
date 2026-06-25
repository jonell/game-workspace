import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Radio,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
  GiftOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { OrderType } from '@chunlv/shared';
import { billingApi } from '../../api/billing';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { Text } = Typography;

type ViewMode = 'daily' | 'monthly';

interface DailyBreakdownItem {
  count: number;
  amount: number;
}

interface DailyRevenueData {
  date: string;
  breakdown: Record<string, DailyBreakdownItem>;
  totalAmount: number;
}

interface CompanionRevenue {
  name: string;
  amount: number;
}

interface MonthlyRevenueData {
  month: string;
  totalAmount: number;
  companionRevenue: CompanionRevenue[];
}

const orderTypeLabel: Record<OrderType, string> = {
  [OrderType.NEW]: '新单',
  [OrderType.RENEW]: '续费',
  [OrderType.REPURCHASE]: '复购',
  [OrderType.TIP]: '打赏',
};

const orderTypeIcon: Record<OrderType, React.ReactNode> = {
  [OrderType.NEW]: React.createElement(ShoppingCartOutlined),
  [OrderType.RENEW]: React.createElement(SyncOutlined),
  [OrderType.REPURCHASE]: React.createElement(GiftOutlined),
  [OrderType.TIP]: React.createElement(HeartOutlined),
};

const orderTypeColor: Record<OrderType, string> = {
  [OrderType.NEW]: '#1677ff',
  [OrderType.RENEW]: '#08979c',
  [OrderType.REPURCHASE]: '#722ed1',
  [OrderType.TIP]: '#fa8c16',
};

const RevenuePage: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('daily');

  // Daily state
  const [dailyDate, setDailyDate] = useState<Dayjs>(dayjs());
  const [dailyData, setDailyData] = useState<DailyRevenueData | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly state
  const [monthlyMonth, setMonthlyMonth] = useState<Dayjs>(dayjs());
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenueData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Download state
  const [dailyDownloading, setDailyDownloading] = useState(false);
  const [monthlyDownloading, setMonthlyDownloading] = useState(false);

  const fetchDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      const dateStr = dailyDate.format('YYYY-MM-DD');
      const { data: res } = await billingApi.dailyRevenue(dateStr);
      setDailyData(res.data ?? null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '加载日收入失败';
      message.error(msg);
    } finally {
      setDailyLoading(false);
    }
  }, [dailyDate]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const monthStr = monthlyMonth.format('YYYY-MM');
      const { data: res } = await billingApi.monthlyRevenue(monthStr);
      setMonthlyData(res.data ?? null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '加载月收入失败';
      message.error(msg);
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyMonth]);

  const handleDownloadDailyCSV = useCallback(async () => {
    setDailyDownloading(true);
    try {
      await billingApi.downloadDailyCSV(dailyDate.format('YYYY-MM-DD'));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '导出日收入CSV失败';
      message.error(msg);
    } finally {
      setDailyDownloading(false);
    }
  }, [dailyDate]);

  const handleDownloadMonthlyCSV = useCallback(async () => {
    setMonthlyDownloading(true);
    try {
      await billingApi.downloadMonthlyCSV(monthlyMonth.format('YYYY-MM'));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || '导出月收入CSV失败';
      message.error(msg);
    } finally {
      setMonthlyDownloading(false);
    }
  }, [monthlyMonth]);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  const orderTypes = [
    OrderType.NEW,
    OrderType.RENEW,
    OrderType.REPURCHASE,
    OrderType.TIP,
  ];

  const monthlyColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 70,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '陪玩',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '收入',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => (
        <Text strong style={{ color: '#cf1322' }}>
          ¥{val.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '占比',
      key: 'percentage',
      render: (_: unknown, record: CompanionRevenue) => {
        const total = monthlyData?.totalAmount ?? 0;
        const pct = total > 0 ? ((record.amount / total) * 100).toFixed(1) : '0.0';
        return `${pct}%`;
      },
    },
  ];

  return (
    <div>
      {/* View mode toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          收入流水
        </Text>
        <Radio.Group
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="daily">日视图</Radio.Button>
          <Radio.Button value="monthly">月视图</Radio.Button>
        </Radio.Group>
      </div>

      {mode === 'daily' && (
        <>
          {/* Date picker + Export */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <DatePicker
              value={dailyDate}
              onChange={(d) => {
                if (d) setDailyDate(d);
              }}
              allowClear={false}
              style={{ width: 200 }}
            />
            <Button
              icon={React.createElement(DownloadOutlined)}
              loading={dailyDownloading}
              onClick={handleDownloadDailyCSV}
            >
              导出 CSV
            </Button>
          </div>

          {/* Revenue cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {orderTypes.map((type) => {
              const item = dailyData?.breakdown?.[type];
              return (
                <Col span={6} key={type}>
                  <Card size="small" loading={dailyLoading}>
                    <Statistic
                      title={
                        <span>
                          <Tag color={orderTypeColor[type]}>
                            {orderTypeLabel[type]}
                          </Tag>
                        </span>
                      }
                      value={item?.amount ?? 0}
                      precision={2}
                      prefix={orderTypeIcon[type]}
                      suffix="¥"
                      valueStyle={{ color: orderTypeColor[type], fontSize: 20 }}
                    />
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">
                        {item?.count ?? 0} 单
                      </Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Total card */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总计"
                  value={dailyData?.totalAmount ?? 0}
                  precision={2}
                  prefix={React.createElement(DollarOutlined)}
                  suffix="¥"
                  valueStyle={{ color: '#cf1322', fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Revenue category bar chart */}
          <Card title="分类收入对比" size="small" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={orderTypes.map((type) => ({
                  name: orderTypeLabel[type],
                  amount: dailyData?.breakdown?.[type]?.amount ?? 0,
                  count: dailyData?.breakdown?.[type]?.count ?? 0,
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value: any) => `¥${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="amount" name="金额" fill="#1677ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Daily breakdown table */}
          <Card title="分类明细" size="small">
            <Table
              dataSource={orderTypes.map((type) => {
                const item = dailyData?.breakdown?.[type];
                return {
                  key: type,
                  type,
                  count: item?.count ?? 0,
                  amount: item?.amount ?? 0,
                };
              })}
              pagination={false}
              locale={{ emptyText: '暂无数据' }}
              columns={[
                {
                  title: '类型',
                  dataIndex: 'type',
                  key: 'type',
                  render: (type: OrderType) => (
                    <Tag color={orderTypeColor[type]}>
                      {orderTypeLabel[type]}
                    </Tag>
                  ),
                },
                {
                  title: '单数',
                  dataIndex: 'count',
                  key: 'count',
                },
                {
                  title: '金额',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (val: number) => `¥${val.toFixed(2)}`,
                },
              ]}
            />
          </Card>
        </>
      )}

      {mode === 'monthly' && (
        <>
          {/* Month picker + Export */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <DatePicker
              picker="month"
              value={monthlyMonth}
              onChange={(d) => {
                if (d) setMonthlyMonth(d);
              }}
              allowClear={false}
              style={{ width: 200 }}
            />
            <Button
              icon={React.createElement(DownloadOutlined)}
              loading={monthlyDownloading}
              onClick={handleDownloadMonthlyCSV}
            >
              导出 CSV
            </Button>
          </div>

          {/* Total card */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" loading={monthlyLoading}>
                <Statistic
                  title={`${monthlyMonth.format('YYYY年MM月')} 总收入`}
                  value={monthlyData?.totalAmount ?? 0}
                  precision={2}
                  prefix={React.createElement(DollarOutlined)}
                  suffix="¥"
                  valueStyle={{ color: '#cf1322', fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Companion revenue bar chart (top 20) */}
          <Card title="陪玩收入对比" size="small" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={Math.max(300, (monthlyData?.companionRevenue ?? []).slice(0, 20).length * 30)}>
              <BarChart
                data={(monthlyData?.companionRevenue ?? []).slice(0, 20).map((c) => ({
                  name: c.name,
                  amount: c.amount,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <RechartsTooltip formatter={(value: any) => `¥${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="amount" name="收入" fill="#cf1322" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Companion breakdown table */}
          <Card title="陪玩收入明细" size="small">
            <Table
              columns={monthlyColumns}
              dataSource={monthlyData?.companionRevenue ?? []}
              rowKey="name"
              loading={monthlyLoading}
              locale={{ emptyText: '暂无收入数据' }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 位陪玩`,
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenuePage;
