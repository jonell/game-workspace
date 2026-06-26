// 蠢驴电竞 — Apple 科技风主题
import type { ThemeConfig } from 'antd';

export const chunlvTheme: ThemeConfig = {
  token: {
    // 色彩 — Apple Human Interface
    colorPrimary: '#007AFF',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorInfo: '#5AC8FA',
    colorTextBase: '#1d1d1f',
    colorBgBase: '#f5f5f7',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#e5e5ea',
    colorBorderSecondary: '#f0f0f5',
    colorLink: '#007AFF',

    // 排版 — SF 风格
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 6,

    // 控件
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 30,
    lineHeight: 1.5,
    paddingContentHorizontal: 24,
    paddingContentVertical: 20,
    paddingLG: 24,
    paddingSM: 16,
    paddingXS: 12,
    marginLG: 24,
    marginSM: 16,

    // 阴影 — 柔和毛玻璃
    boxShadow:
      '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
    boxShadowSecondary:
      '0 4px 16px rgba(0,0,0,0.06)',
    boxShadowTertiary:
      '0 8px 32px rgba(0,0,0,0.08)',
  },

  components: {
    Layout: {
      bodyBg: '#f5f5f7',
      headerBg: 'rgba(255,255,255,0.72)',
      siderBg: '#fafafa',
      triggerBg: '#f5f5f7',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(0,122,255,0.08)',
      itemSelectedColor: '#007AFF',
      itemHoverBg: 'rgba(0,0,0,0.03)',
      itemBorderRadius: 10,
      itemMarginInline: 8,
      itemHeight: 40,
    },
    Card: {
      colorBgContainer: '#ffffff',
      paddingLG: 24,
      borderRadiusLG: 16,
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#fafafa',
      headerColor: '#86868b',
      rowHoverBg: 'rgba(0,122,255,0.03)',
      borderColor: '#f0f0f5',
      headerBorderRadius: 12,
    },
    Button: {
      borderRadius: 10,
      borderRadiusLG: 12,
      borderRadiusSM: 8,
      primaryShadow: '0 2px 8px rgba(0,122,255,0.2)',
      defaultBg: '#ffffff',
      defaultBorderColor: '#e5e5ea',
      defaultColor: '#1d1d1f',
      defaultHoverBg: '#f5f5f7',
      defaultHoverBorderColor: '#007AFF',
      defaultHoverColor: '#007AFF',
      fontWeight: 500,
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e5e5ea',
      colorTextPlaceholder: '#aeaeb2',
      activeBorderColor: '#007AFF',
      borderRadius: 10,
      paddingBlock: 8,
      paddingInline: 14,
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      optionSelectedBg: 'rgba(0,122,255,0.08)',
      borderRadius: 10,
    },
    Modal: {
      colorBgElevated: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 16,
    },
    Tabs: {
      colorBgContainer: 'transparent',
      itemSelectedColor: '#007AFF',
      inkBarColor: '#007AFF',
      itemHoverColor: '#007AFF',
    },
    Tag: {
      borderRadiusSM: 6,
      lineHeight: 1.6,
    },
    Statistic: {
      colorTextDescription: '#86868b',
    },
    Badge: {
      colorText: '#ffffff',
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#1d1d1f',
      trackBg: '#f0f0f5',
    },
    Breadcrumb: {
      colorText: '#aeaeb2',
      lastItemColor: '#1d1d1f',
      linkColor: '#007AFF',
    },
  },
};
