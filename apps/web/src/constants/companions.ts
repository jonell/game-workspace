/**
 * 陪玩/员工管理统一常量 — 所有角色共用
 *
 * 之前 ONLINE/BUSY 颜色在 CompanionListPage 中与 admin/CS 端相反，
 * 现在统一：ONLINE=red, IDLE=green, BUSY=gold, OFFLINE=default
 */

export const companionStatusConfig: Record<string, { color: string; label: string }> = {
  ONLINE: { color: 'red', label: '在线' },
  IDLE: { color: 'green', label: '空闲' },
  BUSY: { color: 'gold', label: '忙碌' },
  OFFLINE: { color: 'default', label: '离线' },
};

/** 状态排序权重（用于列表排序，空闲排最前） */
export const STATUS_SORT: Record<string, number> = {
  IDLE: 0,
  ONLINE: 1,
  BUSY: 2,
  OFFLINE: 3,
};

export const modeLabels: Record<string, string> = {
  ENTERTAINMENT: '娱乐模式',
  WORK: '工作模式',
};

/** 心跳超时阈值（毫秒），超过此时间视为离线 */
export const HEARTBEAT_THRESHOLD = 120_000;
