import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-full py-4 px-3 sm:py-6 sm:px-4 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};