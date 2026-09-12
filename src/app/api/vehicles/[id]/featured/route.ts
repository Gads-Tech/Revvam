import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FeaturedRequest = {
  featured?: unknown;
};

/*
 * =========================================================
 * PATCH — SET / UNSET FEATURED VEHICLE
 * =========================================================
 *
 * A driver can have many vehicles but only ONE featured
 * vehicle at a time.
 *
 * This endpoint:
 *
 *   featured: true
 *      → makes this vehicle featured
 *      → automatically removes featured status from all
 *        other vehicles belonging to the same driver
 *
 *   featured: false
 *      → removes featured status from this vehicle
 *
 * The vehicle must belong to the currently authenticated
 * user.
 */

export async function PATCH(
  request: Request,
  context: RouteContext
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
     * VEHICLE ID
     * =======================================================
     */

    const { id } = await context.params;

    /*
     * =======================================================
     * VERIFY OWNERSHIP
     * =======================================================
     *
     * Never allow a user to feature somebody else's vehicle.
     */

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =======================================================
     * READ REQUEST BODY
     * =======================================================
     */

    let body: FeaturedRequest;

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
     * VALIDATE FEATURED VALUE
     * =======================================================
     */

    if (typeof body.featured !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "Featured value must be true or false.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * REMOVE FEATURED STATUS
     * =======================================================
     */

    if (body.featured === false) {
      const updatedVehicle =
        await prisma.vehicle.update({
          where: {
            id: vehicle.id,
          },

          data: {
            isFeatured: false,
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
        vehicle: updatedVehicle,
      });
    }

    /*
     * =======================================================
     * SET FEATURED
     * =======================================================
     *
     * Use a transaction so the driver's previous featured
     * vehicle is removed before the new one is selected.
     */

    const updatedVehicle =
      await prisma.$transaction(async (tx) => {
        /*
         * Remove featured status from every other vehicle
         * belonging to this driver.
         */

        await tx.vehicle.updateMany({
          where: {
            userId: user.id,
            id: {
              not: vehicle.id,
            },
            isFeatured: true,
          },

          data: {
            isFeatured: false,
          },
        });

        /*
         * Set the selected vehicle as featured.
         */

        return tx.vehicle.update({
          where: {
            id: vehicle.id,
          },

          data: {
            isFeatured: true,
          },

          include: {
            photos: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
      });

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error(
      "Set featured vehicle error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update featured vehicle.",
      },
      {
        status: 500,
      }
    );
  }
}
