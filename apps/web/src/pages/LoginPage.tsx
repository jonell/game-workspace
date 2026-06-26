import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { UserRole } from '@chunlv/shared';
import { useAuthStore } from '../stores/authStore';

const { Text } = Typography;

const IconUser = React.createElement(UserOutlined);
const IconLock = React.createElement(LockOutlined);

const roleRouteMap: Record<UserRole, string> = {
  [UserRole.OWNER]: '/owner/revenue',
  [UserRole.ADMIN]: '/admin/dispatch',
  [UserRole.CS]: '/cs/dispatch',
  [UserRole.COMPANION]: '/cs/dispatch',
};

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('hanlei');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      message.warning('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const user = await login({ username, password });
      message.success(`欢迎回来，${user.username}`);
      const route = roleRouteMap[user.role] || '/login';
      navigate(route, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || '登录失败，请检查用户名和密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <span className="brand-icon">🎮</span>
        <h1>蠢驴电竞</h1>
        <div className="subtitle">CHUNLV ESPORTS · 陪玩派单管理系统</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            size="large"
            placeholder="用户名"
            prefix={IconUser}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onPressEnter={handleLogin}
          />
          <Input.Password
            size="large"
            placeholder="密码"
            prefix={IconLock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
          />
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleLogin}
            style={{
              height: 46,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              marginTop: 4,
            }}
          >
            登 录
          </Button>
        </div>

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Text style={{ color: '#aeaeb2', fontSize: 12 }}>
            v2.0 · 面向电竞陪玩工作室
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
