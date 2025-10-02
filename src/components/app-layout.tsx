import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="container mx-auto px-4">
        {children}
      </main>
    </div>
  );
}