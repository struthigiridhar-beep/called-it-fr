import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Users } from "lucide-react";

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-bg-0 px-4 pt-safe-top pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold text-t-0">Called It</h1>
        <button onClick={signOut} className="p-2 text-t-1 hover:text-t-0 active:scale-95 transition-all">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Empty state */}
      <div className="mt-16 flex flex-col items-center text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-2 border border-b-0">
          <Users className="h-7 w-7 text-t-1" />
        </div>
        <h2 className="text-lg font-semibold text-t-0">No groups yet</h2>
        <p className="text-sm text-t-1 max-w-[260px]">
          Create a group to start making predictions with your friends.
        </p>
        <Button className="rounded-button bg-yes text-white hover:bg-yes/90 active:scale-[0.97] transition-all">
          <Plus className="mr-1.5 h-4 w-4" />
          Create group
        </Button>
      </div>
    </div>
  );
}
