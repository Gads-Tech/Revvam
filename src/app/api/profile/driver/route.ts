import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type DriverRequest = {
  ownsCar?: unknown;

  car?: {
    make?: unknown;
    model?: unknown;
    year?: unknown;
    type?: unknown;
  } | null;

  interests?: unknown;
};

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function POST(request: Request) {
  try {
    /*
     * =========================================================
     * AUTHENTICATION
     * =========================================================
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
     * =========================================================
     * READ REQUEST BODY
     * =========================================================
     */

    let body: DriverRequest;

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
     * =========================================================
     * VALIDATE OWNS CAR
     * =========================================================
     */

    if (typeof body.ownsCar !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please tell us whether you own a car.",
        },
        {
          status: 400,
        }
      );
    }

    const ownsCar = body.ownsCar;

    /*
     * =========================================================
     * VALIDATE INTERESTS
     * =========================================================
     */

    if (!Array.isArray(body.interests)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please choose at least one automotive interest.",
        },
        {
          status: 400,
        }
      );
    }

    const interests = body.interests
      .filter(isNonEmptyString)
      .map((interest) => interest.trim());

    if (interests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Choose at least one automotive interest.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Remove duplicate interests.
     */
    const uniqueInterests = [
      ...new Set(interests),
    ];

    /*
     * =========================================================
     * VALIDATE VEHICLE
     * =========================================================
     */

    let vehicleData:
      | {
          make: string;
          model: string;
          year: number;
          type: string;
        }
      | null = null;

    if (ownsCar) {
      /*
       * Vehicle object must exist.
       */
      if (
        !body.car ||
        typeof body.car !== "object"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please provide your vehicle information.",
          },
          {
            status: 400,
          }
        );
      }

      const make = body.car.make;
      const model = body.car.model;
      const year = body.car.year;
      const type = body.car.type;

      /*
       * ---------------------------------------------------------
       * MAKE
       * ---------------------------------------------------------
       */

      if (!isNonEmptyString(make)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Enter your vehicle's make.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ---------------------------------------------------------
       * MODEL
       * ---------------------------------------------------------
       */

      if (!isNonEmptyString(model)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Enter your vehicle's model.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ---------------------------------------------------------
       * TYPE
       * ---------------------------------------------------------
       */

      if (!isNonEmptyString(type)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Select your vehicle type.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ---------------------------------------------------------
       * YEAR
       * ---------------------------------------------------------
       */

      const numericYear =
        typeof year === "number"
          ? year
          : Number(year);

      if (
        !Number.isInteger(numericYear) ||
        numericYear < 1886 ||
        numericYear >
          new Date().getFullYear() + 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Enter a valid vehicle year.",
          },
          {
            status: 400,
          }
        );
      }

      vehicleData = {
        make: make.trim(),
        model: model.trim(),
        year: numericYear,
        type: type.trim(),
      };
    }

    /*
     * =========================================================
     * SAVE DRIVER PROFILE
     * =========================================================
     *
     * We intentionally avoid the interactive transaction
     * callback because Prisma's generated TransactionClient
     * type is what TypeScript is complaining about.
     *
     * The individual Prisma operations are valid because
     * `prisma.driverProfile` and `prisma.vehicle` are present
     * in the generated Prisma client.
     */

    await prisma.driverProfile.upsert({
      where: {
        userId: user.id,
      },

      create: {
        userId: user.id,
        ownsCar,
        interests: uniqueInterests,
      },

      update: {
        ownsCar,
        interests: uniqueInterests,
      },
    });

    /*
     * =========================================================
     * VEHICLE
     * =========================================================
     */

    if (ownsCar && vehicleData) {
      /*
       * Remove existing vehicles.
       *
       * The onboarding flow currently creates one vehicle.
       * Later we can change this when the garage supports
       * multiple vehicles.
       */

      await prisma.vehicle.deleteMany({
        where: {
          userId: user.id,
        },
      });

      /*
       * Create the submitted vehicle.
       */

      await prisma.vehicle.create({
        data: {
          userId: user.id,

          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          type: vehicleData.type,
        },
      });
    }

    /*
     * =========================================================
     * USER DOES NOT OWN A CAR
     * =========================================================
     *
     * If they previously had a vehicle, remove it.
     */

    if (!ownsCar) {
      await prisma.vehicle.deleteMany({
        where: {
          userId: user.id,
        },
      });
    }

    /*
     * =========================================================
     * FETCH SAVED PROFILE
     * =========================================================
     */

    const driverProfile =
      await prisma.driverProfile.findUnique({
        where: {
          userId: user.id,
        },
      });

    /*
     * =========================================================
     * FETCH VEHICLES
     * =========================================================
     */

    const vehicles =
      await prisma.vehicle.findMany({
        where: {
          userId: user.id,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * =========================================================
     * SUCCESS
     * =========================================================
     */

    return NextResponse.json({
      success: true,

      driverProfile,

      vehicles,
    });
  } catch (error) {
    /*
     * =========================================================
     * ERROR HANDLING
     * =========================================================
     */

    console.error(
      "Driver profile update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to save your driver profile.",
      },
      {
        status: 500,
      }
    );
  }
}