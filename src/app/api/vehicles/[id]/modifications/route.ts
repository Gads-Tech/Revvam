
import { NextResponse } from "next/server";
import { ModificationCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

/**
 * Normalize category values coming from the frontend.
 *
 * Examples:
 * "performance"     -> "PERFORMANCE"
 * "Performance"     -> "PERFORMANCE"
 * "wheels_tires"    -> "WHEELS_TIRES"
 * "wheels tires"    -> "WHEELS_TIRES"
 * "wheels & tires"  -> "WHEELS_TIRES"
 */
function normalizeCategory(value: unknown): string {
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

/**
 * Check whether the category exists in the Prisma enum.
 */
function isValidCategory(
  value: string
): value is ModificationCategory {
  return Object.values(ModificationCategory).includes(
    value as ModificationCategory
  );
}

/**
 * Convert a value into a nullable Decimal.
 */
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

/**
 * Convert an incoming date into a Date object.
 */
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

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    throw new Error("INVALID_DATE");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return date;
}

/**
 * Parse tagged user IDs.
 *
 * Expected frontend format:
 *
 * mentionedUserIds: [
 *   "user_id_1",
 *   "user_id_2"
 * ]
 *
 * An empty array means no one was tagged.
 */
function parseMentionedUserIds(
  value: unknown
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("INVALID_MENTIONED_USER_IDS");
  }

  const ids = value
    .filter(
      (id): id is string =>
        typeof id === "string"
    )
    .map((id) => id.trim())
    .filter(Boolean);

  /*
   * Remove duplicate IDs.
   *
   * Example:
   *
   * ["abc", "abc", "xyz"]
   *
   * becomes:
   *
   * ["abc", "xyz"]
   */
  return [...new Set(ids)];
}

/*
 * =========================================================
 * MENTION SELECT
 * =========================================================
 *
 * This is the public information we return about a tagged
 * user, mechanic, mechanic shop, dealership, etc.
 *
 * We intentionally do NOT return private fields such as:
 * passwordHash, email, sessions, etc.
 */
const mentionUserSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  role: true,
  onboardingType: true,
};

/*
 * =========================================================
 * GET — GET VEHICLE MODIFICATIONS
 * =========================================================
 */

export async function GET(
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
     * VEHICLE ID
     * =====================================================
     */

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY VEHICLE OWNERSHIP
     * =====================================================
     */

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
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

    /*
     * =====================================================
     * GET MODIFICATIONS
     * =====================================================
     *
     * We return:
     *
     * - modification information
     * - modification photos
     * - tagged users / garages / shops
     *
     * The tagged entity is available through:
     *
     * modification.mentions[].mentionedUser
     */

    const modifications =
      await prisma.vehicleModification.findMany({
        where: {
          vehicleId: vehicle.id,
        },

        include: {
          photos: true,

          mentions: {
            include: {
              mentionedUser: {
                select: mentionUserSelect,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },

        orderBy: [
          {
            installedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      modifications,
    });
  } catch (error) {
    /*
     * =====================================================
     * ERROR HANDLING
     * =====================================================
     */

    console.error(
      "Get vehicle modifications error:",
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
            "Database error while loading vehicle modifications.",
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
            "Invalid vehicle modification query.",
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
          "Unable to load vehicle modifications.",
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
 * POST — CREATE VEHICLE MODIFICATION
 * =========================================================
 */

export async function POST(
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
     * VEHICLE ID
     * =====================================================
     */

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY VEHICLE OWNERSHIP
     * =====================================================
     *
     * A user can only add modifications to their own
     * vehicle.
     */

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
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

    /*
     * =====================================================
     * READ REQUEST BODY
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
        typeof body.description === "string"
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
        typeof body.notes === "string"
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

    let cost: Prisma.Decimal | null = null;

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

    let installedAt: Date | null = null;

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
     * MENTIONS / TAGGED USERS
     * =====================================================
     *
     * Frontend format:
     *
     * {
     *   "mentionedUserIds": [
     *     "user_id_1",
     *     "shop_id_2"
     *   ]
     * }
     *
     * Both regular users and business accounts such as
     * mechanic shops and dealerships are stored in User.
     */

    let mentionedUserIds: string[];

    try {
      mentionedUserIds =
        parseMentionedUserIds(
          body.mentionedUserIds
        );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "INVALID_MENTIONED_USER_IDS"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "mentionedUserIds must be an array of user IDs.",
          },
          { status: 400 }
        );
      }

      throw error;
    }

    /*
     * =====================================================
     * PREVENT TAGGING YOURSELF
     * =====================================================
     *
     * This is optional from the database perspective,
     * but it keeps the tagging system cleaner.
     */

    mentionedUserIds =
      mentionedUserIds.filter(
        (mentionedUserId) =>
          mentionedUserId !== user.id
      );

    /*
     * =====================================================
     * VALIDATE TAGGED USERS
     * =====================================================
     *
     * Every ID supplied by the frontend must actually
     * exist in the User table.
     */

    if (mentionedUserIds.length > 0) {
      const taggedUsers =
        await prisma.user.findMany({
          where: {
            id: {
              in: mentionedUserIds,
            },
          },
          select: {
            id: true,
            role: true,
            onboardingType: true,
          },
        });

      const existingUserIds =
        new Set(
          taggedUsers.map(
            (taggedUser) =>
              taggedUser.id
          )
        );

      const invalidUserIds =
        mentionedUserIds.filter(
          (mentionedUserId) =>
            !existingUserIds.has(
              mentionedUserId
            )
        );

      if (invalidUserIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "One or more tagged users could not be found.",
            invalidUserIds,
          },
          { status: 400 }
        );
      }
    }

    /*
     * =====================================================
     * CREATE MODIFICATION + MENTIONS
     * =====================================================
     *
     * The modification and all mention records are created
     * inside one database transaction.
     *
     * If anything fails, nothing is saved.
     */

    const modification =
      await prisma.$transaction(
        async (tx) => {
          const createdModification =
            await tx.vehicleModification.create(
              {
                data: {
                  vehicleId: vehicle.id,
                  title,
                  category,
                  description,
                  cost,
                  installedAt,
                  notes,

                  /*
                   * Create mention records.
                   */
                  mentions:
                    mentionedUserIds.length > 0
                      ? {
                          create:
                            mentionedUserIds.map(
                              (
                                mentionedUserId
                              ) => ({
                                mentionedUserId,
                                mentionedById:
                                  user.id,
                              })
                            ),
                        }
                      : undefined,
                },

                include: {
                  photos: true,

                  mentions: {
                    include: {
                      mentionedUser: {
                        select:
                          mentionUserSelect,
                      },
                    },
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                },
              }
            );

          return createdModification;
        }
      );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,
        modification,
        message:
          mentionedUserIds.length > 0
            ? "Modification added successfully with tagged users."
            : "Modification added successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    /*
     * =====================================================
     * DATABASE / PRISMA ERROR HANDLING
     * =====================================================
     */

    console.error(
      "Create vehicle modification error:",
      error
    );

    /*
     * Prisma known request error
     */
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
            "Database error while creating the modification.",
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

    /*
     * Prisma validation error
     */
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

    /*
     * Generic error
     */
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create vehicle modification.",
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