import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  DollarOutlined,
  TeamOutlined,
  UserOutlined,
  ShopOutlined,
  KeyOutlined,
  SendOutlined,
  AuditOutlined,
  FileTextOutlined,
  DesktopOutlined,
  UnorderedListOutlined,
  HeartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { UserRole } from '@chunlv/shared';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Use React.createElement to bypass @ant-design/icons + @types/react 18.3.x JSX type conflict
const IconRevenue = React.createElement(DollarOutlined);
const IconCustomers = React.createElement(TeamOutlined);
const IconEmployees = React.createElement(UserOutlined);
const IconStudios = React.createElement(ShopOutlined);
const IconAuth = React.createElement(KeyOutlined);
const IconDispatch = React.createElement(SendOutlined);
const IconCompanions = React.createElement(HeartOutlined);
const IconBilling = React.createElement(AuditOutlined);
const IconOrders = React.createElement(FileTextOutlined);
const IconPc = React.createElement(DesktopOutlined);
const IconCompanionStatus = React.createElement(UnorderedListOutlined);
const IconLogout = React.createElement(LogoutOutlined);
const IconFold = React.createElement(MenuFoldOutlined);
const IconUnfold = React.createElement(MenuUnfoldOutlined);

interface MenuItemDef {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const roleMenus: Record<UserRole, MenuItemDef[]> = {
  [UserRole.OWNER]: [
    { key: '/owner/revenue', icon: IconRevenue, label: '盈亏统计' },
    { key: '/owner/customers', icon: IconCustomers, label: '客户管理' },
    { key: '/owner/employees', icon: IconEmployees, label: '员工管理' },
    { key: '/owner/studios', icon: IconStudios, label: '工作室管理' },
    { key: '/owner/authorizations', icon: IconAuth, label: '客户端授权' },
  ],
  [UserRole.ADMIN]: [
    { key: '/admin/dispatch', icon: IconDispatch, label: '派单管理' },
    { key: '/admin/companions', icon: IconCompanions, label: '陪玩管理' },
    { key: '/admin/customers', icon: IconCustomers, label: '客户管理' },
    { key: '/admin/billing', icon: IconBilling, label: '报账审核' },
    { key: '/admin/revenue', icon: IconRevenue, label: '收入流水' },
    { key: '/admin/pc-control', icon: IconPc, label: '远程控制' },
  ],
  [UserRole.CS]: [
    { key: '/cs/dispatch', icon: IconDispatch, label: '派单工作台' },
    { key: '/cs/orders', icon: IconOrders, label: '派单记录' },
    { key: '/cs/companions', icon: IconCompanionStatus, label: '陪玩状态' },
  ],
  [UserRole.COMPANION]: [],
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: '老板',
  [UserRole.ADMIN]: '管理员',
  [UserRole.CS]: '客服',
  [UserRole.COMPANION]: '陪玩',
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && isAuthenticated) {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const menuItems = useMemo(() => {
    if (!user) return [];
    return roleMenus[user.role] || [];
  }, [user]);

  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    const matched = menuItems
      .map((item) => item.key)
      .filter((key) => path.startsWith(key))
      .sort((a, b) => b.length - a.length);
    return matched.length > 0 ? [matched[0]] : [];
  }, [location.pathname, menuItems]);

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user && isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(0,212,255,0.08)',
          }}
        >
          <Text
            style={{
              color: '#00d4ff',
              fontSize: collapsed ? 14 : 17,
              fontWeight: 700,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? '⚡' : '蠢驴电竞'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems as MenuProps['items']}
          onClick={onMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#0d1220',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e2a3a',
            zIndex: 1,
            height: 56,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? IconUnfold : IconFold}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#6b7c93' }}
          />
          <Space size="middle">
            {user && (
              <>
                <Text style={{ color: '#e8eaed' }}>{user.username}</Text>
                <Text style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600 }}>
                  {roleLabels[user.role]}
                </Text>
              </>
            )}
            <Button
              type="text"
              icon={IconLogout}
              onClick={handleLogout}
              style={{ color: '#6b7c93' }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: 20,
            padding: 24,
            background: '#131820',
            borderRadius: 12,
            minHeight: 280,
            border: '1px solid #1e2a3a',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
