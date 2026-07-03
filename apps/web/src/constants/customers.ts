/**
 * 客户管理统一常量 — 所有角色共用
 */

export const customerStatusConfig: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '活跃' },
  FOLLOW_UP: { color: 'blue', label: '跟进' },
  LOST: { color: 'red', label: '流失' },
  PENDING_DEVELOPMENT: { color: 'orange', label: '待开发' },
};

export const platformOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: 'QQ', value: 'QQ' },
  { label: '电话', value: 'PHONE' },
  { label: '其他', value: 'OTHER' },
];

export const customerTypeConfig: Record<string, { color: string; label: string }> = {
  NEW: { color: 'blue', label: '首单客户' },
  REPURCHASE: { color: 'purple', label: '复购客户' },
};
