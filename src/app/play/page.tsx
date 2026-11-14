import { redirect } from "next/navigation";

// "Play today?" was replaced by the weekly schedule.
export default function PlayPage() {
  redirect("/schedule");
}
