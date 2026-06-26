// 蠢驴电竞 — 定制 Ant Design 5 暗色主题
import type { ThemeConfig } from 'antd';

export const chunlvTheme: ThemeConfig = {
  token: {
    // 色彩系统 — 电竞深空蓝
    colorPrimary: '#00d4ff',
    colorSuccess: '#00e676',
    colorWarning: '#ffc048',
    colorError: '#ff3860',
    colorInfo: '#00d4ff',
    colorTextBase: '#e8eaed',
    colorBgBase: '#0b0f19',
    colorBgContainer: '#131820',
    colorBgElevated: '#18202d',
    colorBorder: '#1e2a3a',
    colorBorderSecondary: '#162030',

    // 排版
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // 控件
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 30,
    lineHeight: 1.6,
    paddingContentHorizontal: 20,
    paddingContentVertical: 16,

    // 阴影
    boxShadow:
      '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,212,255,0.05)',
    boxShadowSecondary:
      '0 4px 12px rgba(0,0,0,0.4)',
  },

  components: {
    Layout: {
      bodyBg: '#0b0f19',
      headerBg: '#0d1220',
      siderBg: '#0a0e17',
      triggerBg: '#0d1220',
    },
    Menu: {
      darkItemBg: '#0a0e17',
      darkItemSelectedBg: 'rgba(0,212,255,0.12)',
      darkItemSelectedColor: '#00d4ff',
      darkItemHoverBg: 'rgba(0,212,255,0.06)',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Card: {
      colorBgContainer: '#131820',
      paddingLG: 20,
      borderRadiusLG: 12,
    },
    Table: {
      colorBgContainer: '#131820',
      headerBg: '#0d1220',
      headerColor: '#8b9cb3',
      rowHoverBg: 'rgba(0,212,255,0.04)',
      borderColor: '#1e2a3a',
    },
    Button: {
      borderRadius: 8,
      primaryShadow: '0 0 12px rgba(0,212,255,0.25)',
      defaultBg: '#18202d',
      defaultBorderColor: '#1e2a3a',
      defaultColor: '#e8eaed',
      defaultHoverBg: '#1e2a3a',
      defaultHoverBorderColor: '#00d4ff',
      defaultHoverColor: '#00d4ff',
    },
    Input: {
      colorBgContainer: '#0d1220',
      colorBorder: '#1e2a3a',
      colorTextPlaceholder: '#4a5568',
      activeBorderColor: '#00d4ff',
    },
    Select: {
      colorBgContainer: '#0d1220',
      colorBgElevated: '#18202d',
      optionSelectedBg: 'rgba(0,212,255,0.12)',
    },
    Modal: {
      colorBgElevated: '#131820',
      headerBg: '#0d1220',
    },
    Tabs: {
      colorBgContainer: 'transparent',
      itemSelectedColor: '#00d4ff',
      inkBarColor: '#00d4ff',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Statistic: {
      colorTextDescription: '#6b7c93',
    },
    Badge: {
      colorText: '#e8eaed',
    },
  },
};
