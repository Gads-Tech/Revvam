import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const roleMap = {
  USER: "DRIVER",
  MECHANIC: "MECHANIC",
  MECHANIC_SHOP: "MECHANIC_SHOP",
  DEALERSHIP: "DEALERSHIP",
} as const;

const allowedRoles = [
  "USER",
  "MECHANIC",
  "MECHANIC_SHOP",
  "DEALERSHIP",
] as const;

const allowedOnboardingTypes = [
  "DRIVER",
  "EXPLORER",
  "MECHANIC",
  "MECHANIC_SHOP",
  "DEALERSHIP",
] as const;

type AllowedRole = (typeof allowedRoles)[number];

type AllowedOnboardingType =
  (typeof allowedOnboardingTypes)[number];

export async function POST(request: Request) {
  try {
    /*
     * Make sure the user is authenticated.
     */
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    /*
     * A completed account cannot re-run initial profile setup.
     * Profile editing belongs in the normal profile/edit flows.
     */
    if (user.role !== "USER" || user.onboardingType !== null) {
      return NextResponse.json(
        {
          success: false,
          error: "Your Revvam profile setup is already complete.",
        },
        { status: 403 }
      );
    }

    /*
     * Read the request body.
     */
    const body = await request.json();

    const role = body?.role as string;
    const onboardingType =
      body?.onboardingType as string;

    /*
     * Validate the account role.
     */
    if (
      !allowedRoles.includes(
        role as AllowedRole
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid profile type.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate the onboarding type.
     */
    if (
      !allowedOnboardingTypes.includes(
        onboardingType as AllowedOnboardingType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid onboarding type.",
        },
        { status: 400 }
      );
    }

    const selectedRole =
      role as AllowedRole;

    const selectedOnboardingType =
      onboardingType as AllowedOnboardingType;

    /*
     * Make sure the role and onboarding flow
     * are compatible.
     *
     * USER can be:
     *   DRIVER
     *   EXPLORER
     *
     * MECHANIC can only be:
     *   MECHANIC
     *
     * MECHANIC_SHOP can only be:
     *   MECHANIC_SHOP
     *
     * DEALERSHIP can only be:
     *   DEALERSHIP
     */
    const validCombination =
      (selectedRole === "USER" &&
        (selectedOnboardingType === "DRIVER" ||
          selectedOnboardingType === "EXPLORER")) ||
      (selectedRole === "MECHANIC" &&
        selectedOnboardingType === "MECHANIC") ||
      (selectedRole === "MECHANIC_SHOP" &&
        selectedOnboardingType ===
          "MECHANIC_SHOP") ||
      (selectedRole === "DEALERSHIP" &&
        selectedOnboardingType ===
          "DEALERSHIP");

    if (!validCombination) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected profile type is not valid.",
        },
        { status: 400 }
      );
    }

    /*
     * Save both the account role and the
     * onboarding type.
     */
    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          role: selectedRole,
          onboardingType:
            selectedOnboardingType,
        },

        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          onboardingType: true,
        },
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Profile role update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to save your profile type.",
      },
      { status: 500 }
    );
  }
}