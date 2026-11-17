# frontend/ — Rules (đọc kèm ../CLAUDE.md)
Context: Prototype + docs 05, 01, 02, 03, 04. Chỉ sửa `frontend/` và `e2e/`; chỉ đọc `shared/contracts`.

- Chỉ dùng design tokens (CSS vars/Tailwind theme) từ docs/05; cấm hex rời trong component.
- `src/vision/*` là TypeScript thuần, không import React.
- Không có backend: chỉ fetch file tĩnh cùng origin (`/models`, `/data`, `/mediapipe`).
- Mọi đọc/ghi `localStorage`/IndexedDB qua `src/storage/` (try/catch, có `schema_version`); không gọi storage trực tiếp trong component.
- Vòng lặp khung hình không đi qua React state; UI nhận event throttle ≤ 30 Hz.
- Mỗi component có test Testing Library cho các state ở docs/05 §3.
- A11y: aria-label cho IconButton, `role=progressbar`, kiểm axe trong E2E.
