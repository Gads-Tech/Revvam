import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const user=await getCurrentUser(); if(!user) return NextResponse.json({success:false,error:"You must be logged in."},{status:401});
 if(!["MECHANIC","MECHANIC_SHOP","ADMIN"].includes(user.role)) return NextResponse.json({success:false,error:"Only mechanics and mechanic shops can offer help."},{status:403});
 const {id}=await params; const emergency=await prisma.emergencyRequest.findUnique({where:{id},select:{id:true,status:true,driverId:true}});
 if(!emergency||!["OPEN","OFFERS_RECEIVED"].includes(emergency.status)) return NextResponse.json({success:false,error:"This emergency is no longer available."},{status:409});
 if(emergency.driverId===user.id) return NextResponse.json({success:false,error:"You cannot respond to your own emergency."},{status:400});
 const body=await request.json(); const message=typeof body.message==="string"?body.message.trim().slice(0,500):null;
 const existing=await prisma.emergencyOffer.findUnique({where:{emergencyId_mechanicId:{emergencyId:id,mechanicId:user.id}}});
 if(existing) return NextResponse.json({success:true,offer:existing});
 const offer=await prisma.$transaction(async tx=>{
   const created=await tx.emergencyOffer.create({data:{emergencyId:id,mechanicId:user.id,message}});
   await tx.emergencyRequest.update({where:{id},data:{status:"OFFERS_RECEIVED"}});
   return created;
 });
 return NextResponse.json({success:true,offer},{status:201});
}