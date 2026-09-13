import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
    modificationId: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function findOwnedModification(
  vehicleId: string,
  modificationId: string,
  userId: string
) {
  return prisma.vehicleModification.findFirst({
    where: {
      id: modificationId,
      vehicleId,
      vehicle: { userId },
    },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { id: vehicleId, modificationId } = await context.params;
    const modification = await findOwnedModification(
      vehicleId,
      modificationId,
      user.id
    );

    if (!modification) {
      return NextResponse.json(
        { success: false, error: "Modification not found." },
        { status: 404 }
      );
    }

    const photos = await prisma.modificationPhoto.findMany({
      where: { modificationId: modification.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, photos });
  } catch (error) {
    console.error("Load modification photos error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load modification photos." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { id: vehicleId, modificationId } = await context.params;
    const modification = await findOwnedModification(
      vehicleId,
      modificationId,
      user.id
    );

    if (!modification) {
      return NextResponse.json(
        { success: false, error: "Modification not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("photos")
      .filter(
        (value): value is File => value instanceof File && value.size > 0
      );

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one photo." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `You can upload up to ${MAX_FILES} photos at once.`,
        },
        { status: 400 }
      );
    }

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
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vehicles",
      vehicleId,
      "modifications",
      modificationId
    );

    await mkdir(uploadDirectory, { recursive: true });

    const createdPhotos = [];

    for (const file of files) {
      const extension = EXTENSIONS[file.type] || ".jpg";
      const filename = `${randomUUID()}${extension}`;
      const filePath = path.join(uploadDirectory, filename);
      const bytes = await file.arrayBuffer();

      await writeFile(filePath, Buffer.from(bytes));

      const url = `/uploads/vehicles/${vehicleId}/modifications/${modificationId}/${filename}`;

      const photo = await prisma.modificationPhoto.create({
        data: {
          modificationId,
          url,
        },
      });

      createdPhotos.push(photo);
    }

    return NextResponse.json(
      { success: true, photos: createdPhotos },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload modification photos error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to upload modification photos." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { id: vehicleId, modificationId } = await context.params;
    const modification = await findOwnedModification(
      vehicleId,
      modificationId,
      user.id
    );

    if (!modification) {
      return NextResponse.json(
        { success: false, error: "Modification not found." },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const photoId = url.searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: "Photo ID is required." },
        { status: 400 }
      );
    }

    const photo = await prisma.modificationPhoto.findFirst({
      where: {
        id: photoId,
        modificationId: modification.id,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Photo not found." },
        { status: 404 }
      );
    }

    await prisma.modificationPhoto.delete({ where: { id: photo.id } });

    if (photo.url.startsWith("/uploads/")) {
      const filePath = path.join(
        process.cwd(),
        "public",
        photo.url.replace(/^\/+/, "")
      );

      try {
        await unlink(filePath);
      } catch (error) {
        console.warn("Could not delete physical modification photo:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Modification photo deleted successfully.",
    });
  } catch (error) {
    console.error("Delete modification photo error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to delete modification photo." },
      { status: 500 }
    );
  }
}
