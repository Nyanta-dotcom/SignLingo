/**
 * All user-visible text, Vietnamese (docs/05 §9 question 4 is still open: VI / EN / both).
 * Keeping every string here makes adding English a data change, not a component change.
 */
export const vi = {
  appName: 'SignLingo AI',
  common: { loading: 'Đang tải…', comingSoon: 'Màn hình này đang được xây dựng.', notFound: 'Không tìm thấy trang', startupError: 'Không tải được dữ liệu khởi động' },
  theme: { label: 'Giao diện', system: 'Hệ thống', light: 'Sáng', dark: 'Tối' },
  nav: {
    learn: 'Học', practice: 'Luyện', dictionary: 'Từ điển', lab: 'AI Lab', profile: 'Hồ sơ', settings: 'Cài đặt',
    skip: 'Bỏ qua điều hướng', sidebar: 'Điều hướng chính', bottom: 'Điều hướng nhanh',
  },
  fingers: {
    names: { thumb: 'ngón cái', index: 'ngón trỏ', middle: 'ngón giữa', ring: 'ngón áp út', pinky: 'ngón út' },
    bendMore: (f: string) => `Gập ${f} nhiều hơn`,
    straightenMore: (f: string) => `Duỗi ${f} nhiều hơn`,
  },
  stats: { streak: 'ngày liên tiếp', xp: 'điểm XP', hearts: 'tim' },
} as const;
