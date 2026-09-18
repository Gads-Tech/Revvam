import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

const types = new Set(["BREAKDOWN","OVERHEATING","FLAT_TYRE","DEAD_BATTERY","ENGINE_PROBLEM","ACCIDENT","FUEL_PROBLEM","OTHER"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success:false, error:"You must be logged in." }, {status:401,headers:noStore});
  const emergencies = await prisma.emergencyRequest.findMany({
    where:{ status:{in:["OPEN","OFFERS_RECEIVED"]}, driverId:{not:user.id}},
    orderBy:{createdAt:"desc"}, take:50,
    include:{driver:{select:{id:true,name:true,username:true,image:true}},vehicle:{select:{id:true,make:true,model:true,year:true,image:true}},offers:{select:{id:true,status:true}}}
  });
  return NextResponse.json({success:true,emergencies},{headers:noStore});
}

export async function POST(request:Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({success:false,error:"You must be logged in."},{status:401,headers:noStore});
  if (user.role !== "USER" && user.role !== "ADMIN") return NextResponse.json({success:false,error:"Only driver accounts can request roadside help."},{status:403,headers:noStore});
  const body=await request.json();
  const type=typeof body.type==="string"?body.type:"";
  const description=typeof body.description==="string"?body.description.trim():"";
  const photo=typeof body.photo==="string"?body.photo.trim():null;
  const latitude=Number(body.latitude), longitude=Number(body.longitude);
  const vehicleId=typeof body.vehicleId==="string"?body.vehicleId:null;
  if(!types.has(type)) return NextResponse.json({success:false,error:"Choose a valid emergency type."},{status:400,headers:noStore});
  if(!description) return NextResponse.json({success:false,error:"Describe the problem."},{status:400,headers:noStore});
  if(description.length>1500) return NextResponse.json({success:false,error:"Description is too long."},{status:400,headers:noStore});
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180) return NextResponse.json({success:false,error:"A valid location is required."},{status:400,headers:noStore});
  if(photo && photo.length>12000000) return NextResponse.json({success:false,error:"Photo is too large."},{status:400,headers:noStore});
  if(vehicleId){
    const vehicle=await prisma.vehicle.findFirst({where:{id:vehicleId,userId:user.id},select:{id:true}});
    if(!vehicle) return NextResponse.json({success:false,error:"Vehicle not found."},{status:400,headers:noStore});
  }
  const emergency=await prisma.emergencyRequest.create({data:{driverId:user.id,vehicleId,type:type as any,description,photo:photo||null,latitude,longitude,locationLabel:typeof body.locationLabel==="string"?body.locationLabel.trim()||null:null}});
  return NextResponse.json({success:true,emergency},{status:201,headers:noStore});
}