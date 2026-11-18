/**
 * All user-visible text, Vietnamese (docs/05 §9 question 4 is still open: VI / EN / both).
 * Keeping every string here makes adding English a data change, not a component change.
 */
export const vi = {
  appName: 'SignLingo AI',
  common: { loading: 'Đang tải…' },
  theme: { label: 'Giao diện', system: 'Hệ thống', light: 'Sáng', dark: 'Tối' },
  stats: { streak: 'ngày liên tiếp', xp: 'điểm XP', hearts: 'tim' },
} as const;
