import { NextResponse } from "next/server";
import { mkdir, unlink } from "fs/promises";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/*
 * =========================================================
 * GET
 * =========================================================
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

    const photos =
      await prisma.vehiclePhoto.findMany({
        where: {
          vehicleId: vehicle.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error(
      "Load vehicle photos error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load vehicle photos.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * POST — UPLOAD PHOTOS
 * =========================================================
 */

export async function POST(
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

    const vehicle =
      await prisma.vehicle.findFirst({
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
        { status: 404 }
      );
    }

    const formData = await request.formData();

    const files = formData
      .getAll("photos")
      .filter(
        (value): value is File =>
          value instanceof File &&
          value.size > 0
      );

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select at least one photo.",
        },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error: "You can upload up to 10 photos at once.",
        },
        { status: 400 }
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vehicles",
      vehicle.id
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const createdPhotos = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `${file.name} is not a supported image type.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `${file.name} is larger than 10 MB.`,
          },
          { status: 400 }
        );
      }

      const extensionMap: Record<
        string,
        string
      > = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
      };

      const extension =
        extensionMap[file.type] || ".jpg";

      const filename =
        `${randomUUID()}${extension}`;

      const filePath = path.join(
        uploadDirectory,
        filename
      );

      const bytes = await file.arrayBuffer();

      await writeFile(
        filePath,
        Buffer.from(bytes)
      );

      const url =
        `/uploads/vehicles/${vehicle.id}/${filename}`;

      const photo =
        await prisma.vehiclePhoto.create({
          data: {
            vehicleId: vehicle.id,
            url,
          },
        });

      createdPhotos.push(photo);
    }

    /*
     * Automatically make the first uploaded photo
     * the vehicle's main image if none exists.
     */

    if (
      !vehicle.image &&
      createdPhotos.length > 0
    ) {
      await prisma.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          image: createdPhotos[0].url,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        photos: createdPhotos,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Upload vehicle photos error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to upload vehicle photos.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * PATCH — SET MAIN PHOTO
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

    const vehicle =
      await prisma.vehicle.findFirst({
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
        { status: 404 }
      );
    }

    let body: {
      photoId?: unknown;
    };

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

    if (
      typeof body.photoId !== "string" ||
      !body.photoId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Photo ID is required.",
        },
        { status: 400 }
      );
    }

    const photo =
      await prisma.vehiclePhoto.findFirst({
        where: {
          id: body.photoId,
          vehicleId: vehicle.id,
        },
      });

    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: "Photo not found.",
        },
        { status: 404 }
      );
    }

    await prisma.vehicle.update({
      where: {
        id: vehicle.id,
      },
      data: {
        image: photo.url,
      },
    });

    return NextResponse.json({
      success: true,
      image: photo.url,
      photo,
    });
  } catch (error) {
    console.error(
      "Set main vehicle photo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to set main photo.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * DELETE — DELETE PHOTO
 * =========================================================
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

    const vehicle =
      await prisma.vehicle.findFirst({
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
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const photoId =
      url.searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Photo ID is required.",
        },
        { status: 400 }
      );
    }

    const photo =
      await prisma.vehiclePhoto.findFirst({
        where: {
          id: photoId,
          vehicleId: vehicle.id,
        },
      });

    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: "Photo not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Delete database record first.
     */

    await prisma.vehiclePhoto.delete({
      where: {
        id: photo.id,
      },
    });

    /*
     * Delete physical file.
     */

    if (photo.url.startsWith("/uploads/")) {
      const filePath = path.join(
        process.cwd(),
        "public",
        photo.url.replace(/^\/+/, "")
      );

      try {
        await unlink(filePath);
      } catch (error) {
        console.warn(
          "Could not delete physical photo file:",
          error
        );
      }
    }

    /*
     * If this was the main photo,
     * choose another remaining photo.
     */

    if (vehicle.image === photo.url) {
      const replacement =
        await prisma.vehiclePhoto.findFirst({
          where: {
            vehicleId: vehicle.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      await prisma.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          image: replacement?.url ?? null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete vehicle photo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to delete photo.",
      },
      { status: 500 }
    );
  }
}