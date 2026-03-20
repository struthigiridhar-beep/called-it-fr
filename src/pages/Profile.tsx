import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-bg-0 px-4 pt-4 pb-24">
      <h2 className="text-lg font-bold text-t-0 mb-4">Profile</h2>
      <p className="text-sm text-t-1">{user?.email}</p>
    </div>
  );
}
