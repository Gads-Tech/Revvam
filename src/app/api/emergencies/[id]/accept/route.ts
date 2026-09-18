import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 const user=await getCurrentUser(); if(!user) return NextResponse.json({success:false,error:"You must be logged in."},{status:401});
 const {id}=await params; const body=await request.json(); const offerId=typeof body.offerId==="string"?body.offerId:"";
 const emergency=await prisma.emergencyRequest.findUnique({where:{id},include:{offers:true}});
 if(!emergency) return NextResponse.json({success:false,error:"Emergency not found."},{status:404});
 if(emergency.driverId!==user.id) return NextResponse.json({success:false,error:"Only the driver can accept help."},{status:403});
 if(!["OPEN","OFFERS_RECEIVED"].includes(emergency.status)) return NextResponse.json({success:false,error:"This emergency is no longer accepting offers."},{status:409});
 const offer=emergency.offers.find(o=>o.id===offerId);
 if(!offer) return NextResponse.json({success:false,error:"Offer not found."},{status:404});
 const updated=await prisma.$transaction(async tx=>{
   await tx.emergencyOffer.updateMany({where:{emergencyId:id,id:{not:offerId},status:"PENDING"},data:{status:"DECLINED"}});
   await tx.emergencyOffer.update({where:{id:offerId},data:{status:"ACCEPTED"}});
   return tx.emergencyRequest.update({where:{id},data:{status:"ACCEPTED",acceptedOfferId:offerId,acceptedAt:new Date()}});
 });
 return NextResponse.json({success:true,emergency:updated});
}