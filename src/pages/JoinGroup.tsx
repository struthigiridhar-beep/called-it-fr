import { useParams } from "react-router-dom";
import Landing from "./Landing";

export default function JoinGroup() {
  const { groupId } = useParams();
  // For now, render the landing page. After auth, redirect logic will handle joining.
  return <Landing />;
}
