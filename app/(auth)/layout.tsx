import { MomentumLogo } from "@/components/momentum-logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-zinc-50 via-zinc-50/90 to-[#eef0f7]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,oklch(0.56_0.2_262_/_0.09),transparent_52%)]"
      />
      <header className="relative z-10 border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-lg items-center px-5 sm:px-6">
          <Link
            href="/"
            className="outline-none transition-opacity hover:opacity-90 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400/80"
          >
            <MomentumLogo size="lg" />
          </Link>
        </div>
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
