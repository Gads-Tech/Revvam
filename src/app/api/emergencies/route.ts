import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

function publicLocation(id: string, latitude: number, longitude: number, radiusMeters: number, exact: boolean) {
  if (exact) return { latitude, longitude, radiusMeters, exactLocation: true };

  // Keep the real roadside position private until the request is accepted.
  // The marker stays inside a 500m assistance radius.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  const offsetMeters = 100 + ((hash >>> 8) % 51);
  const dLat = (offsetMeters * Math.cos(angle)) / 111_320;
  const dLng = (offsetMeters * Math.sin(angle)) / (111_320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));
  return {
    latitude: latitude + dLat,
    longitude: longitude + dLng,
    radiusMeters,
    exactLocation: false,
  };
}

const types = new Set(["BREAKDOWN","OVERHEATING","FLAT_TYRE","DEAD_BATTERY","ENGINE_PROBLEM","ACCIDENT","FUEL_PROBLEM","OTHER"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success:false, error:"You must be logged in." }, {status:401,headers:noStore});
  const emergencies = await prisma.emergencyRequest.findMany({
    where:{ status:{in:["OPEN","OFFERS_RECEIVED"]}},
    orderBy:{createdAt:"desc"}, take:50,
    include:{driver:{select:{id:true,name:true,username:true,image:true}},vehicle:{select:{id:true,make:true,model:true,year:true,image:true}},offers:{select:{id:true,status:true,message:true,mechanicId:true,mechanic:{select:{id:true,name:true,username:true,image:true,role:true}}}}}
  });

  const visible = emergencies.map((emergency) => {
    const isOwner = emergency.driverId === user.id;
    const acceptedHelper = emergency.acceptedOfferId
      ? emergency.offers.some((offer) => offer.id === emergency.acceptedOfferId && offer.mechanicId === user.id)
      : false;
    const location = publicLocation(emergency.id, emergency.latitude, emergency.longitude, emergency.radiusMeters, isOwner || acceptedHelper);

    return {
      ...emergency,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      exactLocation: location.exactLocation,
      ghostMode: emergency.ghostMode,
      // Never expose the real coordinates to the public nearby feed.
      ...(location.exactLocation ? {} : { description: emergency.description }),
      ...(emergency.ghostMode ? { latitude: undefined, longitude: undefined, exactLocation: false } : {}),
      offers: emergency.offers.map(({ mechanicId, ...offer }) => offer),
    };
  });

  return NextResponse.json({success:true,emergencies:visible},{headers:noStore});
}

export async function POST(request:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({success:false,error:"You must be logged in."},{status:401,headers:noStore});
  const body=await request.json();
  const type=typeof body.type==="string"?body.type:"";
  const description=typeof body.description==="string"?body.description.trim():"";
  const photo=typeof body.photo==="string"?body.photo.trim():null;
  const latitude=Number(body.latitude), longitude=Number(body.longitude);
  const vehicleId=typeof body.vehicleId==="string"?body.vehicleId:null;
  const radiusMeters=Number(body.radiusMeters);
  const ghostMode=Boolean(body.ghostMode);
  if(!types.has(type)) return NextResponse.json({success:false,error:"Choose a valid emergency type."},{status:400,headers:noStore});
  if(!description) return NextResponse.json({success:false,error:"Describe the problem."},{status:400,headers:noStore});
  if(!Number.isFinite(radiusMeters)||![500,1000,2500,5000].includes(radiusMeters)) return NextResponse.json({success:false,error:"Choose a valid assistance radius."},{status:400,headers:noStore});
  if(description.length>1500) return NextResponse.json({success:false,error:"Description is too long."},{status:400,headers:noStore});
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180) return NextResponse.json({success:false,error:"A valid location is required."},{status:400,headers:noStore});
  if(photo && photo.length>12000000) return NextResponse.json({success:false,error:"Photo is too large."},{status:400,headers:noStore});
  if(vehicleId){
    const vehicle=await prisma.vehicle.findFirst({where:{id:vehicleId,userId:user.id},select:{id:true}});
    if(!vehicle) return NextResponse.json({success:false,error:"Vehicle not found."},{status:400,headers:noStore});
  }
  const emergency=await prisma.$transaction(async (tx) => {
    const created = await tx.emergencyRequest.create({data:{driverId:user.id,vehicleId,type:type as any,description,photo:photo||null,latitude,longitude,locationLabel:typeof body.locationLabel==="string"?body.locationLabel.trim()||null:null,radiusMeters,ghostMode}});

    // Emergency-help alerts are targeted to mechanics/mechanic shops only.
    // Regular drivers can still use the public emergency/map experience where permitted,
    // but they do not receive the mechanic help alert in Discover/Notifications.
    const mechanics = await tx.user.findMany({
      where: { role: { in: ["MECHANIC", "MECHANIC_SHOP"] }, id: { not: user.id } },
      select: { id: true },
    });
    if (mechanics.length) {
      await tx.notification.createMany({
        data: mechanics.map((mechanic) => ({
          userId: mechanic.id,
          actorId: user.id,
          type: "EMERGENCY_OFFER" as const,
          title: "Emergency help needed nearby",
          body: `${user.name} needs help with a ${type.toLowerCase().replaceAll("_", " ")}.`,
          href: "/map",
        })),
      });
    }
    return created;
  });
  return NextResponse.json({success:true,emergency},{status:201,headers:noStore});
}