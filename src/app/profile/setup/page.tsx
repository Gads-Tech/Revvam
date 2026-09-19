import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileSetupClient from "./ProfileSetupClient";

export default async function ProfileSetupPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // A profile is considered completed if the account has a role/onboarding
  // type or already has a mechanic profile. Do this check on the server so
  // completed users never receive the setup UI.
  const mechanicProfile = await prisma.mechanicProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (
    user.role !== "USER" ||
    user.onboardingType !== null ||
    Boolean(mechanicProfile)
  ) {
    redirect("/profile");
  }

  return <ProfileSetupClient />;
}
