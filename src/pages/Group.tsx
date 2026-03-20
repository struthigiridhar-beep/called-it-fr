import { useParams, Outlet } from "react-router-dom";

export default function Group() {
  const { groupId } = useParams();

  return (
    <div className="min-h-[100dvh] bg-bg-0 px-4 pt-4 pb-24">
      <h2 className="text-lg font-bold text-t-0 mb-4">Group</h2>
      <p className="text-sm text-t-1 font-mono-num">ID: {groupId}</p>
      <Outlet />
    </div>
  );
}
