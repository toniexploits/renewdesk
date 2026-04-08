export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-gray-900">
          Renew<span className="text-brand">Desk</span>
        </span>
      </div>
      {children}
    </div>
  )
}
