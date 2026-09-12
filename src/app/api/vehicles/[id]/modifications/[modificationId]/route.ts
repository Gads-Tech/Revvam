import { NextResponse } from "next/server";
import { ModificationCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
    modificationId: string;
  }>;
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeCategory(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/&/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function isValidCategory(
  value: string
): value is ModificationCategory {
  return Object.values(
    ModificationCategory
  ).includes(
    value as ModificationCategory
  );
}

function parseCost(
  value: unknown
): Prisma.Decimal | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    throw new Error("INVALID_COST");
  }

  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    throw new Error("INVALID_COST");
  }

  return new Prisma.Decimal(
    numericValue.toFixed(2)
  );
}

function parseInstalledDate(
  value: unknown
): Date | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("INVALID_DATE");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return date;
}

/*
 * =========================================================
 * FIND MODIFICATION OWNED BY CURRENT USER
 * =========================================================
 */

async function findModification(
  vehicleId: string,
  modificationId: string,
  userId: string
) {
  return prisma.vehicleModification.findFirst({
    where: {
      id: modificationId,
      vehicleId,
      vehicle: {
        userId,
      },
    },
    include: {
      photos: true,
    },
  });
}

/*
 * =========================================================
 * PATCH — UPDATE VEHICLE MODIFICATION
 * =========================================================
 */

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
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
     * =====================================================
     * PARAMS
     * =====================================================
     */

    const {
      id: vehicleId,
      modificationId,
    } = await context.params;

    if (!vehicleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    if (!modificationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY MODIFICATION OWNERSHIP
     * =====================================================
     */

    const existingModification =
      await findModification(
        vehicleId,
        modificationId,
        user.id
      );

    if (!existingModification) {
      return NextResponse.json(
        {
          success: false,
          error: "Modification not found.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * READ BODY
     * =====================================================
     */

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * TITLE
     * =====================================================
     */

    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification title is required.",
        },
        { status: 400 }
      );
    }

    const title = body.title.trim();

    /*
     * =====================================================
     * CATEGORY
     * =====================================================
     */

    const normalizedCategory =
      normalizeCategory(body.category);

    if (!normalizedCategory) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification category is required.",
          validCategories:
            Object.values(
              ModificationCategory
            ),
        },
        { status: 400 }
      );
    }

    if (
      !isValidCategory(
        normalizedCategory
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Invalid modification category: ${body.category}`,
          validCategories:
            Object.values(
              ModificationCategory
            ),
        },
        { status: 400 }
      );
    }

    const category =
      normalizedCategory as ModificationCategory;

    /*
     * =====================================================
     * DESCRIPTION
     * =====================================================
     */

    let description: string | null = null;

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Description must be text.",
          },
          { status: 400 }
        );
      }

      if (
        typeof body.description ===
        "string"
      ) {
        description =
          body.description.trim() ||
          null;
      }
    }

    /*
     * =====================================================
     * NOTES
     * =====================================================
     */

    let notes: string | null = null;

    if (body.notes !== undefined) {
      if (
        body.notes !== null &&
        typeof body.notes !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Notes must be text.",
          },
          { status: 400 }
        );
      }

      if (
        typeof body.notes ===
        "string"
      ) {
        notes =
          body.notes.trim() || null;
      }
    }

    /*
     * =====================================================
     * COST
     * =====================================================
     */

    let cost: Prisma.Decimal | null =
      null;

    try {
      cost = parseCost(body.cost);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "INVALID_COST"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cost must be a valid positive number.",
          },
          { status: 400 }
        );
      }

      throw error;
    }

    /*
     * =====================================================
     * INSTALLED DATE
     * =====================================================
     */

    let installedAt: Date | null =
      null;

    try {
      installedAt =
        parseInstalledDate(
          body.installedAt
        );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "INVALID_DATE"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Installation date is invalid.",
          },
          { status: 400 }
        );
      }

      throw error;
    }

    /*
     * =====================================================
     * UPDATE
     * =====================================================
     */

    const modification =
      await prisma.vehicleModification.update(
        {
          where: {
            id: existingModification.id,
          },
          data: {
            title,
            category,
            description,
            cost,
            installedAt,
            notes,
          },
          include: {
            photos: true,
          },
        }
      );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      modification,
      message:
        "Modification updated successfully.",
    });
  } catch (error) {
    console.error(
      "Update vehicle modification error:",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      console.error(
        "Prisma error code:",
        error.code
      );

      console.error(
        "Prisma error meta:",
        error.meta
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Database error while updating the modification.",
          code: error.code,
          details:
            process.env.NODE_ENV ===
            "development"
              ? error.meta
              : undefined,
        },
        { status: 500 }
      );
    }

    if (
      error instanceof
      Prisma.PrismaClientValidationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid modification data.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update vehicle modification.",
        details:
          process.env.NODE_ENV ===
            "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * DELETE — DELETE VEHICLE MODIFICATION
 * =========================================================
 */

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
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
     * =====================================================
     * PARAMS
     * =====================================================
     */

    const {
      id: vehicleId,
      modificationId,
    } = await context.params;

    if (!vehicleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    if (!modificationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY OWNERSHIP
     * =====================================================
     */

    const existingModification =
      await findModification(
        vehicleId,
        modificationId,
        user.id
      );

    if (!existingModification) {
      return NextResponse.json(
        {
          success: false,
          error: "Modification not found.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * DELETE
     * =====================================================
     *
     * Because ModificationPhoto has:
     *
     * onDelete: Cascade
     *
     * deleting the modification will also
     * delete its associated photo records.
     */

    await prisma.vehicleModification.delete(
      {
        where: {
          id: existingModification.id,
        },
      }
    );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      message:
        "Modification deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete vehicle modification error:",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      console.error(
        "Prisma error code:",
        error.code
      );

      console.error(
        "Prisma error meta:",
        error.meta
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Database error while deleting the modification.",
          code: error.code,
          details:
            process.env.NODE_ENV ===
            "development"
              ? error.meta
              : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to delete vehicle modification.",
        details:
          process.env.NODE_ENV ===
            "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}