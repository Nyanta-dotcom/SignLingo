import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HandIcon, LabIcon, PlayIcon, ShieldLockIcon, SparkleIcon } from '@/components/ui/Icons';
import { MarketingLayout } from './MarketingLayout';

const STEPS = [
  {
    num: '01',
    title: 'Mở camera & chọn bài học',
    desc: 'Bấm Bắt đầu, chọn bài học trên lộ trình và cấp quyền webcam ngay trong trình duyệt. Bạn có thể bấm Đăng nhập ở thanh trên để lưu tiến độ xuyên suốt các thiết bị.',
  },
  {
    num: '02',
    title: 'Trích xuất 21 điểm bàn tay tại chỗ',
    desc: 'MediaPipe Hand Landmarker chạy cục bộ để nhận diện 21 khớp bàn tay và chuẩn hóa tọa độ, không phụ thuộc khoảng cách tới camera.',
  },
  {
    num: '03',
    title: 'Chấm điểm tức thì & đồng bộ tiến độ',
    desc: 'ONNX Runtime phân loại 24 chữ tĩnh, bộ hình học 21 khớp nhận diện số 0–10 và quỹ đạo 2D nhận diện J, Z, 10; kết quả học tập được lưu vào cơ sở dữ liệu khi bạn đăng nhập.',
  },
] as const;

const FAQS = [
  {
    q: 'Hình ảnh webcam của tôi có bị ghi lại hay gửi lên máy chủ không?',
    a: 'Tuyệt đối không. Toàn bộ quá trình theo dõi bàn tay (MediaPipe) và phân loại (ONNX Runtime) chạy 100% bên trong trình duyệt. Không có ảnh hay video webcam nào rời khỏi thiết bị — máy chủ chỉ lưu tiến độ học tập khi bạn đăng nhập.',
  },
  {
    q: 'Tiến độ học và chuỗi ngày (streak) được lưu ở đâu?',
    a: 'Khi bạn đăng nhập tài khoản bằng email và mật khẩu (nút Đăng nhập ở thanh trên), toàn bộ tiến độ bài học, XP, chuỗi ngày và độ thành thạo sẽ được lưu an toàn trên cơ sở dữ liệu (Supabase) và tự động đồng bộ giữa các thiết bị. Nếu chưa đăng nhập, tiến độ vẫn được giữ trên trình duyệt hiện tại.',
  },
  {
    q: 'Các ký hiệu động (J, Z và số 10) được nhận diện như thế nào?',
    a: 'Hệ thống kiểm tra đúng dáng tay khởi đầu (ngón út cho J, ngón trỏ cho Z, ngón cái cho số 10) rồi theo dõi quỹ đạo chuyển động trong không trung và vẽ vệt sáng hồng trực tiếp trên màn hình.',
  },
  {
    q: 'Trình duyệt nào hoạt động tốt nhất?',
    a: 'SignLingo tối ưu cho Google Chrome và Microsoft Edge bản mới trên máy tính có webcam đủ ánh sáng.',
  },
] as const;

/** Page 3 of the 3-page pre-app website: How It Works, Local-Only Privacy Architecture & FAQ. */
export function HowItWorksPage({ onStart }: { onStart: () => void }) {
  return (
    <MarketingLayout onStart={onStart}>
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Header */}
        <section className="hero-enter mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-200 bg-surface px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-fg">
            <ShieldLockIcon className="size-3.5 text-brand-500" />
            Cách hoạt động &amp; Quyền riêng tư
          </span>
          <h1 className="text-balance text-4xl font-black tracking-tight text-text sm:text-5xl">
            AI chạy hoàn toàn trong trình duyệt, riêng tư tuyệt đối
          </h1>
          <p className="text-pretty text-lg text-text-muted">
            Mọi xử lý thị giác máy tính diễn ra trực tiếp trên thiết bị của bạn — không gửi hình ảnh camera, còn tiến độ học tập được lưu trữ và đồng bộ an toàn trên cơ sở dữ liệu.
          </p>
        </section>

        {/* 3 Steps */}
        <section aria-labelledby="steps-title" className="grid gap-5 sm:grid-cols-3">
          <h2 id="steps-title" className="sr-only">3 bước hoạt động</h2>
          {STEPS.map((s, idx) => (
            <Card
              key={s.num}
              className="stagger-in flex flex-col gap-3 p-6 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-(--card-shadow-hover)"
              style={{ '--stagger-i': idx } as CSSProperties}
            >
              <span className="btn-pink inline-flex w-fit rounded-full px-3.5 py-1 text-xs font-black text-ink-on-pink shadow-none">
                BƯỚC {s.num}
              </span>
              <h3 className="text-lg font-black text-text">{s.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{s.desc}</p>
            </Card>
          ))}
        </section>

        {/* Local AI + Cloud Sync Pipeline Diagram */}
        <Card className="border-brand-200 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-text">AI chạy cục bộ trên máy · Tiến độ đồng bộ qua cơ sở dữ liệu</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3.5 py-1 text-xs font-extrabold text-success-fg">
              <ShieldLockIcon className="size-3.5" />
              0 byte ảnh rời khỏi máy
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              { icon: HandIcon, title: 'Webcam', sub: 'Khung hình tại chỗ' },
              { icon: SparkleIcon, title: 'MediaPipe', sub: '21 điểm bàn tay' },
              { icon: LabIcon, title: 'ONNX + Hình học', sub: 'A–Z & Số 0–10' },
              { icon: ShieldLockIcon, title: 'Database', sub: 'Đồng bộ XP & tiến độ' },
            ].map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-brand-50/50 p-4 text-center transition-[transform,border-color,box-shadow] duration-(--motion-fast) hover:-translate-y-1 hover:border-brand-300 hover:shadow-(--card-shadow)"
                >
                  <span
                    className="pipeline-pulse inline-flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-fg"
                    style={{ '--stagger-i': i } as CSSProperties}
                  >
                    <Icon className="size-5" />
                  </span>
                  <p className="font-black text-text">{i + 1}. {stage.title}</p>
                  <p className="text-xs font-bold text-text-muted">{stage.sub}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* FAQ Accordion using native <details> */}
        <section aria-labelledby="faq-title" className="flex flex-col gap-4">
          <h2 id="faq-title" className="text-center text-2xl font-black tracking-tight text-text sm:text-3xl">
            Câu hỏi thường gặp
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-3xl border-2 border-border bg-surface p-5 shadow-(--card-shadow) open:border-brand-300"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-text">
                  <span>{item.q}</span>
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-fg transition-transform duration-(--motion-fast) group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="unit-banner flex flex-col items-center gap-4 rounded-[2rem] px-6 py-10 text-center text-ink-on-pink">
          <h2 className="text-2xl font-black sm:text-3xl">Sẵn sàng thử nhận diện bàn tay ngay bây giờ?</h2>
          <p className="max-w-lg text-sm font-bold sm:text-base">
            Bắt đầu với bài học đầu tiên hoặc mở AI Lab để xem toàn bộ kết quả thí nghiệm thực tế của dự án.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={onStart}>
              <PlayIcon className="size-4" />
              Bắt đầu học ngay
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/lab">Mở AI Lab</Link>
            </Button>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
