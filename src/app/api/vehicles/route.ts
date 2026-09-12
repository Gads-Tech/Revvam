import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type VehicleRequest = {
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
 * GET /api/vehicles
 * =========================================================
 *
 * Loads all vehicles belonging to the currently
 * authenticated user.
 *
 * IMPORTANT:
 * This route is /api/vehicles, so it does NOT have
 * a dynamic [id] parameter.
 */

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const vehicles =
      await prisma.vehicle.findMany({
        where: {
          userId: user.id,
        },

        /*
         * Include the vehicle photo records.
         *
         * This is important now that Vehicle has:
         *
         * photos VehiclePhoto[]
         */
        include: {
          photos: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      vehicles,
    });
  } catch (error) {
    console.error(
      "Load vehicles error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load your vehicles.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * POST /api/vehicles
 * =========================================================
 *
 * Creates a new vehicle for the currently authenticated
 * user.
 *
 * Photo uploading is handled separately through the
 * vehicle photo API. This keeps vehicle creation simple
 * and will allow us to support multiple photos later.
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * =======================================================
     * AUTHENTICATION
     * =======================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =======================================================
     * READ REQUEST BODY
     * =======================================================
     */

    let body: VehicleRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * VALIDATE MAKE
     * =======================================================
     */

    if (!isNonEmptyString(body.make)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your vehicle's make.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * VALIDATE MODEL
     * =======================================================
     */

    if (!isNonEmptyString(body.model)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your vehicle's model.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * VALIDATE TYPE
     * =======================================================
     */

    if (!isNonEmptyString(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Select your vehicle type.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * VALIDATE YEAR
     * =======================================================
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
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * CREATE VEHICLE
     * =======================================================
     */

    const vehicle =
      await prisma.vehicle.create({
        data: {
          userId: user.id,

          make: body.make.trim(),

          model: body.model.trim(),

          year: numericYear,

          type: body.type.trim(),
        },

        /*
         * Return the photo relation as well.
         *
         * A newly-created vehicle will simply have
         * an empty photos array.
         */
        include: {
          photos: true,
        },
      });

    /*
     * =======================================================
     * SUCCESS
     * =======================================================
     */

    return NextResponse.json(
      {
        success: true,
        vehicle,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create vehicle error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to add your vehicle.",
      },
      {
        status: 500,
      }
    );
  }
}