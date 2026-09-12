
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
    photoId: string;
  }>;
};

/*
 * =========================================================
 * PATCH — SET PHOTO AS MAIN VEHICLE IMAGE
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

    const { id, photoId } = await context.params;

    /*
     * Make sure the vehicle belongs to this user.
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
        { status: 404 }
      );
    }

    /*
     * Make sure the photo belongs to this vehicle.
     */

    const photo = await prisma.vehiclePhoto.findFirst({
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
     * Set this photo as the vehicle's main image.
     */

    const updatedVehicle =
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
      vehicle: updatedVehicle,
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
        error:
          "Unable to set this photo as the main image.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * DELETE — DELETE VEHICLE PHOTO COMPLETELY
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

    const { id, photoId } = await context.params;

    /*
     * =======================================================
     * VERIFY VEHICLE
     * =======================================================
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
        { status: 404 }
      );
    }

    /*
     * =======================================================
     * VERIFY PHOTO
     * =======================================================
     */

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
     * Remember whether this photo is currently
     * being used as the vehicle's main image.
     */

    const wasMainPhoto =
      vehicle.image === photo.url;

    /*
     * =======================================================
     * FIND REPLACEMENT PHOTO
     * =======================================================
     *
     * If this is the main image, find another photo
     * BEFORE deleting the current one.
     */

    let replacementPhoto = null;

    if (wasMainPhoto) {
      replacementPhoto =
        await prisma.vehiclePhoto.findFirst({
          where: {
            vehicleId: vehicle.id,
            id: {
              not: photo.id,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
    }

    /*
     * =======================================================
     * DELETE DATABASE RECORD
     * =======================================================
     */

    await prisma.vehiclePhoto.delete({
      where: {
        id: photo.id,
      },
    });

    /*
     * =======================================================
     * UPDATE VEHICLE MAIN IMAGE
     * =======================================================
     */

    if (wasMainPhoto) {
      await prisma.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          image:
            replacementPhoto?.url ?? null,
        },
      });
    }

    /*
     * =======================================================
     * DELETE PHYSICAL IMAGE FILE
     * =======================================================
     *
     * The database stores something like:
     *
     * /uploads/vehicles/VEHICLE_ID/image.jpg
     *
     * We convert that into:
     *
     * /project/public/uploads/vehicles/VEHICLE_ID/image.jpg
     */

    if (photo.url.startsWith("/uploads/")) {
      const relativePath =
        photo.url.replace(
          /^\/+/,
          ""
        );

      const filePath = path.join(
        process.cwd(),
        "public",
        relativePath
      );

      try {
        await unlink(filePath);
      } catch (fileError: unknown) {
        /*
         * ENOENT means the file is already gone.
         *
         * We don't treat that as a failure because
         * the database record has already been removed.
         */

        const errorCode =
          fileError &&
          typeof fileError === "object" &&
          "code" in fileError
            ? (fileError as { code?: string }).code
            : undefined;

        if (errorCode !== "ENOENT") {
          console.error(
            "Unable to delete physical vehicle photo:",
            fileError
          );
        }
      }
    }

    /*
     * =======================================================
     * RESPONSE
     * =======================================================
     */

    return NextResponse.json({
      success: true,
      message:
        "Photo deleted completely.",
      deletedPhotoId: photo.id,
      deletedPhotoUrl: photo.url,
      replacementMainImage:
        replacementPhoto?.url ?? null,
    });
  } catch (error) {
    console.error(
      "Delete vehicle photo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to completely remove this photo.",
      },
      { status: 500 }
    );
  }
}

