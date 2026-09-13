import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import MobileNav from "@/components/MobileNav";
import PhotoLightbox from "@/components/PhotoLightbox";

export default async function PublicVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      },
      photos: {
        orderBy: { createdAt: "asc" },
      },
      modifications: {
        orderBy: { updatedAt: "desc" },
        include: {
          photos: {
            orderBy: { createdAt: "asc" },
          },
          mentions: {
            include: {
              mentionedUser: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                  role: true,
                  onboardingType: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  const mainImage = vehicle.image ?? vehicle.photos[0]?.url ?? null;
  const galleryImages = vehicle.photos.map((photo) => ({
    url: photo.url,
    alt: `${vehicle.make} ${vehicle.model}`,
  }));

  return (
    <main className="min-h-screen bg-black pb-28 text-white md:pb-12">
      <div className="pointer-events-none fixed left-1/2 top-[-300px] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/[0.07] blur-[160px]" />
      <div className="pointer-events-none fixed bottom-[-260px] right-[-180px] z-0 h-[500px] w-[500px] rounded-full bg-red-950/[0.10] blur-[160px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-32 pt-7 sm:px-8 sm:pt-10">
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-sm text-white/50 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white"
          >
            <span>←</span>
            <span>Discover</span>
          </Link>

          {vehicle.isFeatured && (
            <div className="rounded-full border border-red-400/20 bg-red-500/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-red-300">
              Featured vehicle
            </div>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="relative aspect-[16/9] max-h-[620px] overflow-hidden bg-black sm:aspect-[2/1]">
            {mainImage ? (
              <PhotoLightbox
                images={[{
                  url: mainImage,
                  alt: `${vehicle.make} ${vehicle.model}`,
                }]}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-8xl opacity-20">🚗</div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

            <div className="pointer-events-none absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/80">
                {vehicle.year ?? "Year unknown"} · {vehicle.type ?? "Vehicle"}
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
                {vehicle.make} {vehicle.model}
              </h1>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/25">Vehicle spotlight</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">The build</h2>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Make", vehicle.make],
                  ["Model", vehicle.model],
                  ["Year", vehicle.year?.toString() ?? "—"],
                  ["Type", vehicle.type ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-white/25">{label}</p>
                    <p className="mt-2 truncate text-sm font-semibold text-white/80">{value}</p>
                  </div>
                ))}
              </div>

              {vehicle.modifications.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-400/60">Build details</p>
                  <div className="mt-4 space-y-3">
                    {vehicle.modifications.map((modification) => {
                      const modificationImages = modification.photos.map((photo) => ({
                        url: photo.url,
                        alt: `${modification.title} on ${vehicle.make} ${vehicle.model}`,
                      }));

                      return (
                        <div key={modification.id} className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                          <div className="flex gap-4">
                            {modificationImages.length > 0 ? (
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
                                <PhotoLightbox
                                  images={modificationImages}
                                  className="h-full w-full"
                                  imageClassName="h-full w-full"
                                />
                              </div>
                            ) : (
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl">🔧</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">{modification.title}</p>
                                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-red-300/60">{modification.category.replaceAll("_", " ")}</p>
                                </div>
                                {modificationImages.length > 0 && (
                                  <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/30">
                                    {modificationImages.length} {modificationImages.length === 1 ? "photo" : "photos"}
                                  </span>
                                )}
                              </div>
                              {modification.description && (
                                <MentionedText text={modification.description} mentions={modification.mentions} />
                              )}
                            </div>
                          </div>

                          {modificationImages.length > 1 && (
                            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {modificationImages.map((image, index) => (
                                <div key={`${image.url}-${index}`} className="aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                                  <PhotoLightbox
                                    images={modificationImages}
                                    initialIndex={index}
                                    className="h-full w-full"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {modification.notes && (
                            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                              <p className="text-[9px] uppercase tracking-[0.14em] text-white/20">Notes</p>
                              <MentionedText text={modification.notes} mentions={modification.mentions} />
                            </div>
                          )}

                          {modification.mentions.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {modification.mentions.map(({ mentionedUser }) => (
                                <Link
                                  key={mentionedUser.id}
                                  href={`/users/${encodeURIComponent(mentionedUser.username)}`}
                                  className="rounded-full border border-red-400/15 bg-red-500/[0.07] px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/[0.14]"
                                >
                                  @{mentionedUser.username}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vehicle.photos.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-400/60">Gallery</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {vehicle.photos.map((photo, index) => (
                      <div key={photo.id} className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
                        <PhotoLightbox
                          images={galleryImages}
                          initialIndex={index}
                          className="h-full w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="h-fit rounded-3xl border border-white/[0.07] bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/25">Owner</p>
              <Link href={`/users/${encodeURIComponent(vehicle.user.username)}`} className="mt-5 flex items-center gap-4 rounded-2xl transition hover:bg-white/[0.03]">
                {vehicle.user.image ? (
                  <img src={vehicle.user.image} alt={vehicle.user.name} className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15 text-lg font-bold text-red-300">
                    {vehicle.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{vehicle.user.name}</p>
                  <p className="truncate text-sm text-white/30">@{vehicle.user.username}</p>
                </div>
              </Link>

              {vehicle.user.bio && (
                <p className="mt-5 border-t border-white/[0.06] pt-5 text-sm leading-6 text-white/35">
                  {vehicle.user.bio}
                </p>
              )}

              <Link href={`/users/${encodeURIComponent(vehicle.user.username)}`} className="mt-6 block rounded-2xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-center text-sm font-medium text-white/65 transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white">
                View owner profile
              </Link>
            </aside>
          </div>
        </section>
      </div>

      <MobileNav />
    </main>
  );
}

function MentionedText({
  text,
  mentions,
}: {
  text: string;
  mentions: Array<{
    mentionedUser: {
      id: string;
      username: string;
    };
  }>;
}) {
  const users = new Map(
    mentions.map((mention) => [
      mention.mentionedUser.username.toLowerCase(),
      mention.mentionedUser.username,
    ])
  );

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/35">
      {text.split(/(@[a-zA-Z0-9_.-]+)/g).map((part, index) => {
        if (!part.startsWith("@")) {
          return <span key={index}>{part}</span>;
        }

        const typedUsername = part.slice(1);
        const targetUsername = users.get(typedUsername.toLowerCase()) ?? typedUsername;

        return (
          <Link
            key={index}
            href={`/users/${encodeURIComponent(targetUsername)}`}
            className="relative z-20 font-medium text-red-400 hover:text-red-300 hover:underline hover:underline-offset-4"
          >
            {part}
          </Link>
        );
      })}
    </p>
  );
}
