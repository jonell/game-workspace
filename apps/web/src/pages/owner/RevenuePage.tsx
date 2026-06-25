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

const { Text, Title } = Typography;

interface ProfitLossData {
  month: string;
  studioId: string;
  totalRevenue: number;
  totalExpense: number;
  profit: number;
}

const SECOND_TOKEN_KEY = 'secondToken';

const RevenuePage: React.FC = () => {
  const [secondToken, setSecondToken] = useState<string>(
    () => sessionStorage.getItem(SECOND_TOKEN_KEY) ?? '',
  );
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);

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
      // Token might be expired
      if (err?.response?.status === 401) {
        sessionStorage.removeItem(SECOND_TOKEN_KEY);
        setSecondToken('');
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [secondToken]);

  useEffect(() => {
    if (secondToken) {
      fetchStats();
    }
  }, [secondToken, fetchStats]);

  const handleLogout = () => {
    sessionStorage.removeItem(SECOND_TOKEN_KEY);
    setSecondToken('');
    setData(null);
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
            onClick={fetchStats}
            loading={loading}
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
    </div>
  );
};

export default RevenuePage;
