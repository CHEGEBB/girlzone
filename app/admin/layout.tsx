import type React from "react"
import AdminSidebar from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full">
      {/* Sidebar - Fixed Position */}
      <div className="hidden border-r bg-card text-card-foreground lg:block fixed inset-y-0 left-0 z-30 w-[280px] overflow-y-auto">
        <AdminSidebar />
      </div>
      
      {/* Main Content Wrapper */}
      <div className="flex flex-col lg:pl-[280px] min-h-screen">
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
