import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function BottomNav() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-0 border-t border-b-0 pb-safe-bottom z-50">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        <Link to="/home" className={`flex flex-col items-center gap-0.5 ${isActive("/home") ? "text-t-0" : "text-t-2"}`}>
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center gap-0.5 ${isActive("/profile") ? "text-t-0" : "text-t-2"}`}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        <button onClick={() => signOut()} className="flex flex-col items-center gap-0.5 text-t-2">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
