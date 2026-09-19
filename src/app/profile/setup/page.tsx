import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ProfileSetupClient from "./ProfileSetupClient";

export default async function ProfileSetupPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "USER" || user.onboardingType !== null) redirect("/profile");

  return <ProfileSetupClient />;
}
