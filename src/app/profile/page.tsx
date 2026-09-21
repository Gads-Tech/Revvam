import Link from "next/link";
import { redirect } from "next/navigation";
import { CarIcon, MechanicIcon, StorefrontIcon, SettingsIcon, LocationIcon, BellIcon, MessageIcon, EditIcon, ArrowRightIcon, PlusIcon, UserIcon, GarageIcon } from "@/components/icons/RevvamIcons";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

import FollowBackButton from "@/components/FollowBackButton";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import AppHeader from "@/components/AppHeader";
import MobileProfileLogout from "@/components/MobileProfileLogout";
import BackButton from "@/components/BackButton";

const roleLabels: Record<string, string> = {
  USER: "Driver / Car Enthusiast",
  MECHANIC: "Mechanic",
  MECHANIC_SHOP: "Mechanic Shop",
  DEALERSHIP: "Dealership",
  ADMIN: "Administrator",
};

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  USER: CarIcon,
  MECHANIC: MechanicIcon,
  MECHANIC_SHOP: StorefrontIcon,
  DEALERSHIP: CarIcon,
  ADMIN: SettingsIcon,
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [vehicles, postCount, followers, following, unreadNotifications, unreadMessages] = await Promise.all([
    prisma.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { photos: { orderBy: { createdAt: "asc" }, take: 1 } } }),
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
  const RoleIcon = roleIcons[user.role] ?? CarIcon;
  const vehicleCount = vehicles.length;
  const featuredVehicle = vehicles.find((vehicle) => vehicle.isFeatured) ?? vehicles[0] ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(127,29,29,0.10),transparent_30%)]" />
      <div className="pointer-events-none fixed left-1/2 top-[-320px] z-0 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-red-600/[0.05] blur-[170px]" />

      <AppHeader />


      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-6 flex items-center justify-start gap-4 md:mb-8"><BackButton /></div>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="h-28 bg-gradient-to-br from-red-600/[0.18] via-red-950/[0.10] to-transparent sm:h-36" />
          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-12 flex flex-col gap-6 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4"><Avatar image={user.image} fallback={firstLetter} size="xl" /><div className="min-w-0 pb-1"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-400/75">Your Revvam profile</p><h1 className="mt-1 truncate text-3xl font-black tracking-[-0.045em] sm:text-4xl">{user.name}</h1><p className="mt-1 text-sm text-white/35">@{user.username}</p></div></div>
              <div className="flex shrink-0 items-center gap-2"><Link href={`/users/${encodeURIComponent(user.username)}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-xs font-semibold text-white/60 transition hover:border-white/[0.16] hover:text-white"><span className="inline-flex items-center gap-2"><UserIcon className="h-4 w-4" /> View public profile</span></Link><Link href="/profile/edit" className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/15"><span className="inline-flex items-center gap-2"><EditIcon className="h-4 w-4" /> Edit profile</span></Link></div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full border border-red-400/20 bg-red-500/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300"><RoleIcon className="h-3.5 w-3.5" /> {roleLabel}</span>{user.location && <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/45"><LocationIcon className="mr-1 inline-block h-3.5 w-3.5 align-[-0.15em]" /> {user.location}</span>}</div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">{user.bio || "Your profile is ready for your story, your cars and your Revvam community."}</p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat value={postCount} label="Posts" /><Stat value={vehicleCount} label="Vehicles" /><Link href="#followers" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center transition hover:border-red-500/20 hover:bg-red-500/[0.04]"><p className="text-xl font-black">{followers.length}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">Followers</p></Link><Link href="#following" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center transition hover:border-red-500/20 hover:bg-red-500/[0.04]"><p className="text-xl font-black">{following.length}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">Following</p></Link></div>
          </div>
        </section>

        <div className="mt-6"><section className="overflow-hidden rounded-[2rem] border border-red-500/15 bg-gradient-to-br from-red-600/[0.09] via-white/[0.025] to-transparent"><div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/75">Garage spotlight</p><h2 className="mt-1 text-xl font-bold">{featuredVehicle ? `${featuredVehicle.make} ${featuredVehicle.model}` : "Build your garage"}</h2></div><Link href={user.role === "MECHANIC" ? "/profile/mechanic" : "/profile/driver"} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 transition hover:border-red-500/25 hover:text-white"><span className="inline-flex items-center gap-2"><GarageIcon className="h-4 w-4" /> Manage</span></Link></div>
          {featuredVehicle ? <Link href={`/profile/cars/${featuredVehicle.id}`} className="group grid sm:grid-cols-[1.05fr_0.95fr]"><div className="relative h-56 overflow-hidden bg-black sm:h-64">{featuredVehicle.image || featuredVehicle.photos[0]?.url ? <img src={featuredVehicle.image || featuredVehicle.photos[0].url} alt={`${featuredVehicle.make} ${featuredVehicle.model}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-7xl opacity-20"><CarIcon className="h-16 w-16 opacity-20" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />{featuredVehicle.isFeatured && <span className="absolute left-4 top-4 rounded-full bg-red-600/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em]">Featured vehicle</span>}</div><div className="flex flex-col justify-center p-6 sm:p-7"><p className="text-[10px] uppercase tracking-[0.17em] text-red-400/60">{featuredVehicle.year ?? "Year unknown"} · {featuredVehicle.type ?? "Vehicle"}</p><p className="mt-4 text-sm leading-6 text-white/35">Keep your main build, photos and modifications easy to discover from your profile.</p><span className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-white/55 transition group-hover:border-red-500/20 group-hover:bg-red-500/[0.07] group-hover:text-white">Open build <ArrowRightIcon className="h-4 w-4" /></span></div></Link> : <div className="px-6 py-12 text-center sm:px-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl"><CarIcon className="h-16 w-16 opacity-20" /></div><h3 className="mt-4 text-lg font-semibold">Your garage is empty</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/30">Add your first vehicle and start building your public automotive identity.</p><Link href="/profile/cars/add" className="mt-5 inline-flex rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-100 hover:bg-red-500/15"><PlusIcon className="mr-1 h-4 w-4" /> Add vehicle</Link></div>}
        </section></div>

        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Your garage</p><h2 className="mt-1 text-xl font-bold">Vehicles on Revvam</h2><p className="mt-1 text-sm text-white/30">Manage the vehicles people can explore on your public profile.</p></div><Link href={user.role === "MECHANIC" ? "/profile/mechanic" : "/profile/driver"} className="inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-red-500/20 hover:text-white">Manage garage</Link></div>
          {vehicles.length > 0 ? <div className="mt-6 grid gap-3 md:grid-cols-2">{vehicles.map((vehicle) => { const image = vehicle.image || vehicle.photos[0]?.url; return <Link key={vehicle.id} href={`/profile/cars/${vehicle.id}`} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 transition hover:-translate-y-0.5 hover:border-red-500/20 hover:bg-red-500/[0.035]"><div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">{image ? <img src={image} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-2xl opacity-30"><CarIcon className="h-8 w-8 opacity-30" /></div>}{vehicle.isFeatured && <span className="absolute bottom-1 left-1 rounded bg-red-600/85 px-1.5 py-0.5 text-[7px] font-bold uppercase">Featured</span>}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-white/85 group-hover:text-white">{vehicle.make} {vehicle.model}</h3><p className="mt-1 text-xs text-white/25">{vehicle.year ?? "Year unknown"} · {vehicle.type ?? "Vehicle"}</p></div><ArrowRightIcon className="h-4 w-4 shrink-0 text-white/20 transition group-hover:text-red-300" /></Link>; })}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/[0.09] px-6 py-10 text-center text-sm text-white/30">No vehicles yet.</div>}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <SocialList id="followers" title="Followers" subtitle="People following you" count={followers.length}>{followers.length > 0 ? followers.map((item) => <PersonRow key={item.id} image={item.follower.image} name={item.follower.name} username={item.follower.username} role={item.follower.role} action={<FollowBackButton username={item.follower.username} following={followedBackIds.has(item.follower.id)} />} />) : <EmptySocial text="No one is following you yet." />}</SocialList>
          <SocialList id="following" title="Following" subtitle="People you follow" count={following.length}>{following.length > 0 ? following.map((item) => <PersonRow key={item.id} image={item.following.image} name={item.following.name} username={item.following.username} role={item.following.role} />) : <EmptySocial text="You are not following anyone yet." />}</SocialList>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Account</p><h2 className="mt-1 text-lg font-semibold">{user.email}</h2><p className="mt-1 text-sm text-white/25">@{user.username} · {roleLabel}</p></div><div className="flex flex-wrap gap-2"><Link href="/profile/edit" className="inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/50 hover:border-red-500/20 hover:text-white">Account settings</Link><Link href="/profile/privacy" className="inline-flex w-fit rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/[0.10]">Online & last seen</Link></div></div></section>
        <MobileProfileLogout />
      </div>
      <MobileNav />
    </main>
  );
}

function HeaderAction({ href, label, icon, count, compact = false }: { href: string; label: string; icon: React.ReactNode; count: number; compact?: boolean }) {
  return <Link href={href} aria-label={label} title={label} className={`relative inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 transition hover:border-red-500/25 hover:bg-red-500/[0.06] hover:text-white ${compact ? "h-10 w-10" : "h-10 min-w-10 px-3"}`}><span className={compact ? "text-base" : "text-sm"}>{icon}</span>{!compact && <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</span>}{count > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full border border-black bg-red-600 px-1 text-[8px] font-black text-white">{count > 99 ? "99+" : count}</span>}</Link>;
}

function Avatar({ image, fallback, size }: { image: string | null; fallback: string; size: "sm" | "xl" }) {
  const classes = size === "sm" ? "h-8 w-8 rounded-full text-xs" : "h-24 w-24 rounded-[1.7rem] text-3xl sm:h-28 sm:w-28";
  return image ? <img src={image} alt="Profile" className={`${classes} shrink-0 border border-white/[0.13] bg-black object-cover shadow-2xl`} /> : <div className={`${classes} flex shrink-0 items-center justify-center border border-red-500/20 bg-red-600/[0.12] font-black text-red-200 shadow-[0_0_50px_rgba(239,68,68,0.10)]`}>{fallback}</div>;
}

function Stat({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">{label}</p></div>; }

function SocialList({ id, title, subtitle, count, children }: { id: string; title: string; subtitle: string; count: number; children: React.ReactNode }) {
  return <div id={id} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Community</p><h2 className="mt-1 text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-white/30">{subtitle}</p></div><span className="text-xs text-white/25">{count}</span></div><div className="mt-5 space-y-2">{children}</div></div>;
}

function PersonRow({ image, name, username, role, action }: { image: string | null; name: string | null; username: string; role: string | null; action?: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3"><Link href={`/users/${encodeURIComponent(username)}`} className="shrink-0"><Avatar image={image} fallback={(name || username).charAt(0).toUpperCase()} size="sm" /></Link><div className="min-w-0 flex-1"><Link href={`/users/${encodeURIComponent(username)}`} className="block truncate text-sm font-semibold">{name || username}</Link><p className="truncate text-xs text-white/25">@{username}{role ? ` · ${role}` : ""}</p></div>{action}</div>;
}

function EmptySocial({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-white/25">{text}</p>; }
