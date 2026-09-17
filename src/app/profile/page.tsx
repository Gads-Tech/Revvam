import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

import FollowBackButton from "@/components/FollowBackButton";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import MobileProfileLogout from "@/components/MobileProfileLogout";
import BackButton from "@/components/BackButton";

const roleLabels: Record<string, string> = {
  USER: "Driver / Car Enthusiast",
  MECHANIC: "Mechanic",
  MECHANIC_SHOP: "Mechanic Shop",
  DEALERSHIP: "Dealership",
  ADMIN: "Administrator",
};

const roleIcons: Record<string, string> = {
  USER: "🚗",
  MECHANIC: "🔧",
  MECHANIC_SHOP: "🏪",
  DEALERSHIP: "🚘",
  ADMIN: "⚙️",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [vehicles, postCount, followers, following, unreadNotifications, unreadMessages] =
    await Promise.all([
      prisma.vehicle.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { photos: { orderBy: { createdAt: "asc" }, take: 1 } },
      }),
      prisma.post.count({ where: { authorId: user.id } }),
      prisma.follow.findMany({ where: { followingId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, follower: { select: { id: true, name: true, username: true, image: true, role: true } } } }),
      prisma.follow.findMany({ where: { followerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, following: { select: { id: true, name: true, username: true, image: true, role: true } } } }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.message.count({ where: { senderId: { not: user.id }, readAt: null, conversation: { members: { some: { userId: user.id } } } } }),
    ]);

  const followerIds = followers.map((item) => item.follower.id);
  const followedBack = followerIds.length ? await prisma.follow.findMany({ where: { followerId: user.id, followingId: { in: followerIds } }, select: { followingId: true } }) : [];
  const followedBackIds = new Set(followedBack.map((item) => item.followingId));
  const firstLetter = user.name?.charAt(0).toUpperCase() || "R";
  const roleLabel = roleLabels[user.role] ?? "Revvam Member";
  const roleIcon = roleIcons[user.role] ?? "🚗";
  const vehicleCount = vehicles.length;
  const featuredVehicle = vehicles.find((vehicle) => vehicle.isFeatured) ?? vehicles[0] ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(127,29,29,0.10),transparent_30%)]" />
      <div className="pointer-events-none fixed left-1/2 top-[-320px] z-0 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-red-600/[0.05] blur-[170px]" />
      <header className="sticky top-0 z-50 hidden border-b border-white/[0.07] bg-black/75 backdrop-blur-2xl md:block">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-8 px-6 lg:px-8">
          <Logo className="h-11 w-auto shrink-0" />
          <nav className="flex flex-1 items-center justify-center gap-8">
            <Link href="/home" className="text-sm font-medium text-white/45 transition hover:text-white">Discover</Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition hover:text-white">Mechanics</Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition hover:text-white">Dealerships</Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition hover:text-white">Events</Link>
          </nav>
          <div className="flex items-center gap-2">
            <HeaderAction href="/profile/notifications" label="Notifications" icon="♢" count={unreadNotifications} />
            <HeaderAction href="/messages" label="Messages" icon="✉" count={unreadMessages} />
            <Link href="/profile" className="ml-1 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] py-1.5 pl-1.5 pr-3 transition hover:border-red-500/25 hover:bg-red-500/[0.06]"><Avatar image={user.image} fallback={firstLetter} size="sm" /><span className="max-w-28 truncate text-xs font-medium text-white/70">@{user.username}</span></Link>
          </div>
        </div>
      </header>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-6 flex items-center justify-start gap-4 md:mb-8"><BackButton /></div>
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="h-28 bg-gradient-to-br from-red-600/[0.18] via-red-950/[0.10] to-transparent sm:h-36" />
          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-12 flex flex-col gap-6 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4"><Avatar image={user.image} fallback={firstLetter} size="xl" /><div className="min-w-0 pb-1"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-400/75">Your Revvam profile</p><h1 className="mt-1 truncate text-3xl font-black tracking-[-0.045em] sm:text-4xl">{user.name}</h1><p className="mt-1 text-sm text-white/35">@{user.username}</p></div></div>
              <div className="flex shrink-0 items-center gap-2"><Link href={`/users/${encodeURIComponent(user.username)}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-xs font-semibold text-white/60 transition hover:border-white/[0.16] hover:text-white">View public profile</Link><Link href="/profile/edit" className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/15">Edit profile</Link></div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full border border-red-400/20 bg-red-500/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">{roleIcon} {roleLabel}</span>{user.location && <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/45">📍 {user.location}</span>}</div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">{user.bio || "Your profile is ready for your story, your cars and your Revvam community."}</p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat value={postCount} label="Posts" /><Stat value={vehicleCount} label="Vehicles" /><Link href="#followers" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center transition hover:border-red-500/20 hover:bg-red-500/[0.04]"><p className="text-xl font-black">{followers.length}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">Followers</p></Link><Link href="#following" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center transition hover:border-red-500/20 hover:bg-red-500/[0.04]"><p className="text-xl font-black">{following.length}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">Following</p></Link></div>
          </div>
        </section>

        <div className="mt-6"><section className="overflow-hidden rounded-[2rem] border border-red-500/15 bg-gradient-to-br from-red-600/[0.09] via-white/[0.025] to-transparent"><div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/75">Garage spotlight</p><h2 className="mt-1 text-xl font-bold">{featuredVehicle ? `${featuredVehicle.make} ${featuredVehicle.model}` : "Build your garage"}</h2></div><Link href="/profile/driver" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 transition hover:border-red-500/25 hover:text-white">Manage</Link></div>
            {featuredVehicle ? <Link href={`/profile/cars/${featuredVehicle.id}`} className="group grid sm:grid-cols-[1.05fr_0.95fr]"><div className="relative h-56 overflow-hidden bg-black sm:h-64">{featuredVehicle.image || featuredVehicle.photos[0]?.url ? <img src={featuredVehicle.image || featuredVehicle.photos[0].url} alt={`${featuredVehicle.make} ${featuredVehicle.model}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-7xl opacity-20">🚗</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />{featuredVehicle.isFeatured && <span className="absolute left-4 top-4 rounded-full bg-red-600/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em]">Featured vehicle</span>}</div><div className="flex flex-col justify-center p-6 sm:p-7"><p className="text-[10px] uppercase tracking-[0.17em] text-red-400/60">{featuredVehicle.year ?? "Year unknown"} · {featuredVehicle.type ?? "Vehicle"}</p><p className="mt-4 text-sm leading-6 text-white/35">Keep your main build, photos and modifications easy to discover from your profile.</p><span className="mt-5 inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-white/55 transition group-hover:border-red-500/20 group-hover:bg-red-500/[0.07] group-hover:text-white">Open build →</span></div></Link> : <div className="px-6 py-12 text-center sm:px-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl">🚗</div><h3 className="mt-4 text-lg font-semibold">Your garage is empty</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/30">Add your first vehicle and start building your public automotive identity.</p><Link href="/profile/cars/add" className="mt-5 inline-flex rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-100 hover:bg-red-500/15">+ Add vehicle</Link></div>}
          </section></div>

        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Your garage</p><h2 className="mt-1 text-xl font-bold">Vehicles on Revvam</h2><p className="mt-1 text-sm text-white/30">Manage the vehicles people can explore on your public profile.</p></div><Link href="/profile/driver" className="inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-red-500/20 hover:text-white">Manage garage</Link></div>{vehicles.length > 0 ? <div className="mt-6 grid gap-3 md:grid-cols-2">{vehicles.map((vehicle) => { const image = vehicle.image || vehicle.photos[0]?.url; return <Link key={vehicle.id} href={`/profile/cars/${vehicle.id}`} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 transition hover:-translate-y-0.5 hover:border-red-500/20 hover:bg-red-500/[0.035]"><div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">{image ? <img src={image} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-3xl opacity-20">🚗</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{vehicle.make} {vehicle.model}</p><p className="mt-1 text-xs text-white/25">{vehicle.year ?? "Year unknown"} · {vehicle.type ?? "Vehicle"}</p></div><span className="text-white/20 transition group-hover:text-white/50">→</span></Link>; })}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-sm text-white/25">No vehicles added yet.</div>}</section>

        <section id="followers" className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Community</p><h2 className="mt-1 text-xl font-bold">Followers</h2></div><span className="text-xs text-white/25">{followers.length}</span></div>{followers.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{followers.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3"><Link href={`/users/${encodeURIComponent(item.follower.username)}`}><Avatar image={item.follower.image} fallback={item.follower.name?.charAt(0).toUpperCase() || "R"} size="md" /></Link><div className="min-w-0 flex-1"><Link href={`/users/${encodeURIComponent(item.follower.username)}`} className="block truncate text-sm font-semibold">{item.follower.name}</Link><p className="truncate text-xs text-white/25">@{item.follower.username}</p></div>{followedBackIds.has(item.follower.id) ? <span className="text-[10px] text-white/20">Following</span> : <FollowBackButton username={item.follower.username} />}</div>)}</div> : <p className="mt-5 text-sm text-white/25">No followers yet.</p>}</section>

        <section id="following" className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Community</p><h2 className="mt-1 text-xl font-bold">Following</h2></div><span className="text-xs text-white/25">{following.length}</span></div>{following.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{following.map((item) => <Link key={item.id} href={`/users/${encodeURIComponent(item.following.username)}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3"><Avatar image={item.following.image} fallback={item.following.name?.charAt(0).toUpperCase() || "R"} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.following.name}</p><p className="truncate text-xs text-white/25">@{item.following.username}</p></div></Link>)}</div> : <p className="mt-5 text-sm text-white/25">Not following anyone yet.</p>}</section>

        <MobileProfileLogout />
      </div>
      <MobileNav />
    </main>
  );
}

function HeaderAction({ href, label, icon, count }: { href: string; label: string; icon: string; count: number }) { return <Link href={href} aria-label={label} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm text-white/45 transition hover:border-red-500/25 hover:text-white">{icon}{count > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-black bg-red-500 px-1 text-center text-[8px] font-bold text-white">{count > 99 ? "99+" : count}</span>}</Link>; }
function Stat({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">{label}</p></div>; }
function Avatar({ image, fallback, size = "md" }: { image: string | null; fallback: string; size?: "sm" | "md" | "xl" }) { const sizes = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-sm", xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl" }; return image ? <img src={image} alt="" className={`${sizes[size]} rounded-3xl border border-white/[0.12] bg-black object-cover shadow-xl`} /> : <div className={`${sizes[size]} flex items-center justify-center rounded-3xl border border-white/[0.12] bg-white/[0.05] font-bold text-white/35 shadow-xl`}>{fallback}</div>; }
