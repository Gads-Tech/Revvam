
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VehicleUpdateRequest = {
  make?: unknown;
  model?: unknown;
  year?: unknown;
  type?: unknown;
};

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

/*
 * =========================================================
 * GET — LOAD VEHICLE
 * =========================================================
 *
 * Also loads the vehicle's photo gallery.
 */

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
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

    const { id } = await context.params;

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        photos: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error(
      "Get vehicle error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load your vehicle.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * PATCH — UPDATE VEHICLE
 * =========================================================
 */

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
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

    const { id } = await context.params;

    const existingVehicle =
      await prisma.vehicle.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!existingVehicle) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    let body: VehicleUpdateRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * MAKE
     * ---------------------------------------------------------
     */

    if (!isNonEmptyString(body.make)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your vehicle's make.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * MODEL
     * ---------------------------------------------------------
     */

    if (!isNonEmptyString(body.model)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your vehicle's model.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * TYPE
     * ---------------------------------------------------------
     */

    if (!isNonEmptyString(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Select your vehicle type.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * YEAR
     * ---------------------------------------------------------
     */

    const numericYear =
      typeof body.year === "number"
        ? body.year
        : Number(body.year);

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 1886 ||
      numericYear >
        new Date().getFullYear() + 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid vehicle year.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * UPDATE
     * ---------------------------------------------------------
     */

    const vehicle = await prisma.vehicle.update({
      where: {
        id: existingVehicle.id,
      },

      data: {
        make: body.make.trim(),
        model: body.model.trim(),
        year: numericYear,
        type: body.type.trim(),
      },

      include: {
        photos: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error(
      "Update vehicle error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update your vehicle.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * DELETE — DELETE VEHICLE
 * =========================================================
 *
 * VehiclePhoto records are automatically deleted because
 * VehiclePhoto.vehicle uses onDelete: Cascade.
 */

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
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

    const { id } = await context.params;

    /*
     * Make sure the vehicle belongs
     * to the currently logged-in user.
     */

    const existingVehicle =
      await prisma.vehicle.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!existingVehicle) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Delete the vehicle.
     *
     * Its VehiclePhoto records will also be removed
     * automatically by the database cascade.
     */

    await prisma.vehicle.delete({
      where: {
        id: existingVehicle.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Vehicle removed successfully.",
    });
  } catch (error) {
    console.error(
      "Delete vehicle error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to remove your vehicle.",
      },
      { status: 500 }
    );
  }
}
