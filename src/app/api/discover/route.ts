import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const blocked = await prisma.block.findMany({
      where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = blocked.map((b) => b.blockerId === user.id ? b.blockedId : b.blockerId);

    const [following, followers, likedPosts, commentedPosts, sharedPosts] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } }),
      prisma.follow.findMany({ where: { followingId: user.id }, select: { followerId: true } }),
      prisma.postLike.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { postId: true } }),
      prisma.postComment.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { postId: true } }),
      prisma.postShare.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { postId: true } }),
    ]);
    const friendIds = new Set([...following.map((f) => f.followingId), ...followers.map((f) => f.followerId)]);
    const interactedPostIds = [...new Set([...likedPosts.map((x) => x.postId), ...commentedPosts.map((x) => x.postId), ...sharedPosts.map((x) => x.postId)])];

    const [users, vehicles, events, searchPosts, posts, myVehicles] = await Promise.all([
      q ? prisma.user.findMany({
        where: { id: { notIn: [user.id, ...blockedIds] }, OR: [
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ]},
        take: 20,
        select: { id: true, name: true, username: true, image: true, bio: true, role: true, onboardingType: true },
      }) : [],
      q ? prisma.vehicle.findMany({
        where: { userId: { notIn: [user.id, ...blockedIds] }, OR: [
          { make: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
          { type: { contains: q, mode: "insensitive" } },
        ]},
        take: 8,
        orderBy: { createdAt: "desc" },
        select: { id: true, make: true, model: true, year: true, image: true, listingStatus: true, listingPrice: true, listingCurrency: true, listingLocation: true, user: { select: { username: true, name: true, image: true } } },
      }) : [],
      q ? prisma.post.findMany({
        where: { authorId: { notIn: [user.id, ...blockedIds] }, OR: [
          { content: { contains: q, mode: "insensitive" } },
        ]},
        take: 8,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, image: true, video: true, createdAt: true, author: { select: { name: true, username: true, image: true } } },
      }) : [],
      q ? prisma.event.findMany({
        where: { OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { locationLabel: { contains: q, mode: "insensitive" } },
        ]},
        take: 8,
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, description: true, locationLabel: true, startsAt: true, createdAt: true, image: true, host: { select: { username: true, name: true } } },
      }) : [],
      prisma.post.findMany({
        where: { authorId: { notIn: [user.id, ...blockedIds] } },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { likes: true, comments: true, shares: true } },
        },
      }),
      prisma.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, make: true, model: true, year: true, listingStatus: true, listingPrice: true, listingCurrency: true, listingLocation: true, listingDescription: true } }),
    ]);

    const followingIds = new Set(following.map((f) => f.followingId));
    const interactionAuthorIds = interactedPostIds.length
      ? new Set((await prisma.post.findMany({ where: { id: { in: interactedPostIds } }, select: { authorId: true } })).map((p) => p.authorId))
      : new Set<string>();

    const rankedUsers = users
      .map((u) => ({
        ...u,
        _priority:
          (friendIds.has(u.id) ? 1000 : 0) +
          (interactionAuthorIds.has(u.id) ? 500 : 0) +
          (u.username.toLowerCase() === q.replace(/^@/, "").toLowerCase() ? 250 : 0),
      }))
      .sort((a, b) => b._priority - a._priority || a.username.localeCompare(b.username))
      .slice(0, 8)
      .map(({ _priority, ...u }) => u);
    const personalized = posts.map((post) => {
      const engagement = post._count.likes * 3 + post._count.comments * 4 + post._count.shares * 2;
      const freshness = Math.max(0, 48 - (Date.now() - post.createdAt.getTime()) / 3600000);
      const relationship = followingIds.has(post.authorId) ? 35 : 0;
      return { ...post, score: Math.round(engagement + freshness + relationship), createdAt: post.createdAt.toISOString() };
    }).sort((a, b) => b.score - a.score).slice(0, 12);

    const marketplace = await prisma.vehicle.findMany({
      where: { listingStatus: "FOR_SALE", userId: { notIn: [user.id, ...blockedIds] } },
      take: 12,
      orderBy: [{ isFeatured: "desc" }, { listedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, make: true, model: true, year: true, image: true, listingPrice: true, listingCurrency: true, listingLocation: true, listingDescription: true, isFeatured: true, user: { select: { username: true, name: true, image: true } } },
    });

    const ratedUsers = await prisma.review.groupBy({
      by: ["targetId"],
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 8,
    });
    const topRated = await Promise.all(ratedUsers.map(async (r) => {
      const target = await prisma.user.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, username: true, image: true, role: true, onboardingType: true } });
      return target ? { ...target, averageRating: Number((r._avg.rating ?? 0).toFixed(1)), reviewCount: r._count.rating } : null;
    }));

    const serializeVehicle = (v: any) => ({ ...v, listingPrice: v.listingPrice == null ? null : Number(v.listingPrice) });
    return NextResponse.json({
      success: true,
      query: q,
      search: { users: rankedUsers, vehicles: vehicles.map(serializeVehicle), posts: searchPosts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })), events },
      personalized: personalized.map(({ score, ...post }) => post),
      marketplace: marketplace.map(serializeVehicle),
      myVehicles: myVehicles.map(serializeVehicle),
      topRated: topRated.filter(Boolean),
    });
  } catch (error) {
    console.error("Discover API error:", error);
    return NextResponse.json({ success: false, error: "Unable to load Discover right now." }, { status: 500 });
  }
}