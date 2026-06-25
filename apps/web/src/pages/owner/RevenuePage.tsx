import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Input,
  Button,
  Typography,
  Space,
  message,
} from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { authApi } from '../../api/client';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const { Text, Title } = Typography;

interface ProfitLossData {
  month: string;
  studioId: string;
  totalRevenue: number;
  totalExpense: number;
  profit: number;
}

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  description?: string | null;
  date: string;
}

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  '工资': '#ff4d4f',
  '租金': '#fa8c16',
  '设备': '#722ed1',
  '推广': '#1677ff',
  '其他': '#8c8c8c',
};

const FALLBACK_PIE_COLORS = ['#ff4d4f', '#fa8c16', '#722ed1', '#1677ff', '#52c41a', '#08979c', '#eb2f96', '#a0d911'];

const SECOND_TOKEN_KEY = 'secondToken';

const RevenuePage: React.FC = () => {
  const [secondToken, setSecondToken] = useState<string>(
    () => sessionStorage.getItem(SECOND_TOKEN_KEY) ?? '',
  );
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const handleVerify = async () => {
    if (!password.trim()) {
      message.warning('请输入二级密码');
      return;
    }
    setVerifying(true);
    try {
      const { data: res } = await authApi.verifySecond(password.trim());
      const token = res.data?.secondToken ?? '';
      sessionStorage.setItem(SECOND_TOKEN_KEY, token);
      setSecondToken(token);
      setPassword('');
      message.success('验证成功');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '验证失败';
      message.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const fetchStats = useCallback(async () => {
    if (!secondToken) return;
    setLoading(true);
    try {
      const { data: res } = await billingApi.profitLoss(secondToken);
      setData(res.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载盈亏数据失败';
      message.error(msg);
      if (err?.response?.status === 401) {
        sessionStorage.removeItem(SECOND_TOKEN_KEY);
        setSecondToken('');
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [secondToken]);

  const fetchExpenses = useCallback(async () => {
    if (!secondToken) return;
    setExpensesLoading(true);
    try {
      const { data: res } = await billingApi.expenses(secondToken);
      setExpenses(res.data ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载支出数据失败';
      message.error(msg);
    } finally {
      setExpensesLoading(false);
    }
  }, [secondToken]);

  useEffect(() => {
    if (secondToken) {
      fetchStats();
      fetchExpenses();
    }
  }, [secondToken, fetchStats, fetchExpenses]);

  const handleLogout = () => {
    sessionStorage.removeItem(SECOND_TOKEN_KEY);
    setSecondToken('');
    setData(null);
    setExpenses([]);
  };

  const profitColor = data ? (data.profit >= 0 ? '#3f8600' : '#cf1322') : undefined;
  const ProfitIcon = data?.profit != null && data.profit >= 0 ? ArrowUpOutlined : ArrowDownOutlined;

  if (!secondToken) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, color: '#1677ff' }}>
              {React.createElement(LockOutlined)}
            </div>
            <Title level={4} style={{ marginTop: 16 }}>
              二级密码验证
            </Title>
            <Text type="secondary">
              查看盈亏数据需要先验证二级密码
            </Text>
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input.Password
              placeholder="请输入二级密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleVerify}
              size="large"
            />
            <Button
              type="primary"
              block
              size="large"
              loading={verifying}
              onClick={handleVerify}
            >
              验证
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          盈亏统计
          {data && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
              ({data.month})
            </Text>
          )}
        </Text>
        <Space>
          <Button
            icon={React.createElement(ReloadOutlined)}
            onClick={() => { fetchStats(); fetchExpenses(); }}
            loading={loading || expensesLoading}
          >
            刷新
          </Button>
          <Button onClick={handleLogout}>退出</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总收入"
              value={data?.totalRevenue ?? 0}
              precision={2}
              prefix={React.createElement(DollarOutlined)}
              suffix="¥"
              valueStyle={{ color: '#3f8600', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总支出"
              value={data?.totalExpense ?? 0}
              precision={2}
              prefix={React.createElement(DollarOutlined)}
              suffix="¥"
              valueStyle={{ color: '#cf1322', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="净利润"
              value={data?.profit ?? 0}
              precision={2}
              prefix={
                data?.profit != null
                  ? React.createElement(ProfitIcon)
                  : React.createElement(DollarOutlined)
              }
              suffix="¥"
              valueStyle={{ color: profitColor, fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      {(data || expenses.length > 0) && (
        <>
          {/* Revenue vs Expense comparison */}
          {data && (
            <Card title="收入 vs 支出" size="small" style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: '收入', amount: data.totalRevenue },
                    { name: '支出', amount: data.totalExpense },
                    { name: '利润', amount: data.profit },
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => `¥${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="amount" name="金额" radius={[4, 4, 0, 0]}>
                    <Cell key="revenue" fill="#3f8600" />
                    <Cell key="expense" fill="#cf1322" />
                    <Cell key="profit" fill="#1677ff" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Expense category pie chart */}
          {expenses.length > 0 && (
            <Card title="支出分类占比" size="small" style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={(() => {
                      const catMap = new Map<string, number>();
                      for (const e of expenses) {
                        const cat = e.category || '其他';
                        catMap.set(cat, (catMap.get(cat) ?? 0) + e.amount);
                      }
                      return Array.from(catMap.entries()).map(([name, value]) => ({
                        name,
                        value: Math.round(value * 100) / 100,
                      }));
                    })()}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    dataKey="value"
                  >
                    {(() => {
                      const catMap = new Map<string, number>();
                      for (const e of expenses) {
                        const cat = e.category || '其他';
                        catMap.set(cat, (catMap.get(cat) ?? 0) + e.amount);
                      }
                      return Array.from(catMap.keys()).map((name, i) => (
                        <Cell
                          key={name}
                          fill={EXPENSE_CATEGORY_COLORS[name] ?? FALLBACK_PIE_COLORS[i % FALLBACK_PIE_COLORS.length]}
                        />
                      ));
                    })()}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => `¥${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default RevenuePage;
