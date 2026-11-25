import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-app lg:pl-[264px]">
      <Sidebar />
      <div className="flex min-h-dvh flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-soft">
      Cargando…
    </div>
  );
}
