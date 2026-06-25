import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Select, Typography, Space, message } from 'antd';
import { OrderStatus, OrderType } from '@chunlv/shared';
import { ordersApi } from '../../api/orders';

const { Text } = Typography;
const { Option } = Select;

const statusConfig: Record<OrderStatus, { color: string; label: string }> = {
  [OrderStatus.PENDING]: { color: 'processing', label: '待派单' },
  [OrderStatus.GRABBED]: { color: 'cyan', label: '已接单' },
  [OrderStatus.CONFIRMED]: { color: 'blue', label: '已确认' },
  [OrderStatus.DONE]: { color: 'green', label: '已完成' },
  [OrderStatus.CANCELLED]: { color: 'default', label: '已取消' },
};

const orderTypeConfig: Record<OrderType, { color: string; label: string }> = {
  [OrderType.NEW]: { color: 'blue', label: '新单' },
  [OrderType.RENEW]: { color: 'cyan', label: '续费' },
  [OrderType.REPURCHASE]: { color: 'purple', label: '复购' },
  [OrderType.TIP]: { color: 'orange', label: '打赏' },
};

interface Order {
  id: string;
  gameName: string;
  amount: number;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: string;
  customer?: {
    wechatId: string;
  };
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await ordersApi.list(params);
      const list = data.data?.items ?? data.data ?? [];
      setOrders(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载订单失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = (value: OrderStatus | undefined) => {
    setStatusFilter(value);
  };

  const columns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      ellipsis: true,
    },
    {
      title: '游戏',
      dataIndex: 'gameName',
      key: 'gameName',
      width: 120,
    },
    {
      title: '客户微信号',
      key: 'wechatId',
      width: 160,
      render: (_: unknown, record: Order) => (
        <Text>{record.customer?.wechatId ?? '-'}</Text>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '类型',
      dataIndex: 'orderType',
      key: 'orderType',
      width: 80,
      render: (type: OrderType) => {
        const cfg = orderTypeConfig[type];
        return <Tag color={cfg?.color}>{cfg?.label ?? type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: OrderStatus) => {
        const cfg = statusConfig[status];
        return <Tag color={cfg?.color}>{cfg?.label ?? status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => {
        if (!val) return '-';
        return new Date(val).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  ];

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
          派单记录
        </Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text>状态筛选：</Text>
          <Select
            allowClear
            placeholder="全部状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={handleStatusChange}
          >
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <Option key={key} value={key}>
                {cfg.label}
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无订单记录' }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条订单`,
        }}
      />
    </div>
  );
};

export default OrdersPage;
