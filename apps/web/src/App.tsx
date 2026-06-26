import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { chunlvTheme } from './theme';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ConfigProvider theme={chunlvTheme} locale={zhCN}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
