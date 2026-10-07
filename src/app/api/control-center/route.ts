import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "overview";
  const q = searchParams.get("q")?.trim() || "";

  if (section === "users") {
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: { createdAt: "desc" }, take: 100,
      select: { id:true,name:true,username:true,email:true,role:true,onboardingType:true,image:true,bio:true,location:true,createdAt:true,suspendedAt:true,suspendedReason:true },
    });
    return NextResponse.json({ users });
  }
  if (section === "posts") {
    const posts = await prisma.post.findMany({
      where: q ? { OR: [{ content: { contains:q, mode:"insensitive" } }, { author:{ username:{ contains:q, mode:"insensitive" } } }] } : undefined,
      orderBy:{createdAt:"desc"},take:100,include:{author:{select:{id:true,name:true,username:true,image:true}},_count:{select:{likes:true,comments:true,reports:true}}},
    });
    return NextResponse.json({ posts });
  }
  if (section === "reports") {
    const reports = await prisma.report.findMany({ orderBy:{createdAt:"desc"},take:100,include:{reporter:{select:{id:true,name:true,username:true}},target:{select:{id:true,name:true,username:true}},post:{select:{id:true,content:true,author:{select:{username:true}}}}} });
    return NextResponse.json({ reports });
  }
  if (section === "emergencies") {
    const emergencies = await prisma.emergencyRequest.findMany({ orderBy:{createdAt:"desc"},take:100,include:{driver:{select:{id:true,name:true,username:true,image:true}},vehicle:{select:{make:true,model:true,year:true}},_count:{select:{offers:true}}} });
    return NextResponse.json({ emergencies });
  }
  if (section === "audit") {
    const logs = await prisma.adminAuditLog.findMany({ orderBy:{createdAt:"desc"},take:200,include:{actor:{select:{username:true,name:true}},targetUser:{select:{username:true,name:true}}} });
    return NextResponse.json({ logs });
  }
  if (section === "notifications") {
    const notifications = await prisma.notification.findMany({ where:{isSystem:true},orderBy:{createdAt:"desc"},take:100,select:{id:title:true} });
    return NextResponse.json({ notifications });
  }
  return NextResponse.json({ stats:{
    users:await prisma.user.count(),posts:await prisma.post.count(),comments:await prisma.postComment.count(),
    reports:await prisma.report.count({where:{status:"OPEN"}}),emergencies:await prisma.emergencyRequest.count({where:{status:{in:["OPEN","OFFERS_RECEIVED"]}}}),
    notifications:await prisma.notification.count({where:{isSystem:true}})
  }, superAdmin:auth.user.role==="SUPER_ADMIN" });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error:"Unauthorized" },{status:401});
  if (!auth.authorized) return NextResponse.json({ error:"Forbidden" },{status:403});
  const body = await request.json().catch(()=>({}));
  const action=String(body.action||""), targetId=body.targetId?String(body.targetId):null;

  const audit=(details:string,targetType?:string,targetUserId?:string)=>prisma.adminAuditLog.create({data:{actorId:auth.user!.id,targetUserId:targetUserId??(targetType==="USER"?targetId:null),action,targetType,targetId,details}});

  if(action==="broadcast_notification"){
    const superAuth=await requireSuperAdmin();
    if(!superAuth.authorized) return NextResponse.json({error:"Super Admin authority required."},{status:403});
    const title=String(body.title||"").trim(), message=String(body.message||"").trim(), href=body.href?String(body.href):null;
    if(!title||!message) return NextResponse.json({error:"Title and message are required."},{status:400});
    const users=await prisma.user.findMany({select:{id:true}});
    const rows=users.map(user=>({userId:user.id,actorId:auth.user!.id,type:"ADMIN_ANNOUNCEMENT" as const,title,body:message,href,isSystem:true}));
    await prisma.$transaction(async tx=>{for(let i=0;i<rows.length;i+=500) await tx.notification.createMany({data:rows.slice(i,i+500)});});
    await audit(`Broadcast sent to ${users.length} users: ${title}`,"BROADCAST");
    return NextResponse.json({success:true,sent:users.length});
  }

  if(action==="update_user"){
    if(!targetId)return NextResponse.json({error:"User required."},{status:400});
    const target=await prisma.user.findUnique({where:{id:targetId},select:{role:true}});
    if(!target)return NextResponse.json({error:"User not found."},{status:404});
    if(target.role==="SUPER_ADMIN"&&auth.user.role!=="SUPER_ADMIN")return NextResponse.json({error:"Insufficient authority."},{status:403});
    const data:any={};
    for(const key of ["name","bio","location","email","username","onboardingType"]) if(typeof body[key]==="string") data[key]=body[key].trim()||null;
    if(body.role&&["USER","MECHANIC","DEALERSHIP","MECHANIC_SHOP","ADMIN"].includes(body.role)){
      if(target.role==="SUPER_ADMIN")return NextResponse.json({error:"Super Admin cannot be changed."},{status:403});
      if(body.role==="ADMIN"&&auth.user.role!=="SUPER_ADMIN")return NextResponse.json({error:"Super Admin authority required."},{status:403});
      data.role=body.role;
    }
    await prisma.user.update({where:{id:targetId},data});
    await audit("User profile/role edited","USER",targetId);
    return NextResponse.json({success:true});
  }

  if(action==="delete_post"){if(!targetId)return NextResponse.json({error:"Post required."},{status:400});await prisma.post.delete({where:{id:targetId}});await audit("Post deleted","POST");return NextResponse.json({success:true});}
  if(action==="delete_comment"){if(!targetId)return NextResponse.json({error:"Comment required."},{status:400});await prisma.postComment.delete({where:{id:targetId}});await audit("Comment deleted","COMMENT");return NextResponse.json({success:true});}
  if(action==="resolve_report"||action==="dismiss_report"){if(!targetId)return NextResponse.json({error:"Report required."},{status:400});await prisma.report.update({where:{id:targetId},data:{status:action==="resolve_report"?"RESOLVED":"DISMISSED"}});await audit("Report "+(action==="resolve_report"?"resolved":"dismissed"),"REPORT");return NextResponse.json({success:true});}
  if(action==="close_emergency"){if(!targetId)return NextResponse.json({error:"Emergency required."},{status:400});await prisma.emergencyRequest.update({where:{id:targetId},data:{status:"COMPLETED",completedAt:new Date()}});await audit("Emergency closed by platform","EMERGENCY");return NextResponse.json({success:true});}
  return NextResponse.json({error:"Unknown admin action."},{status:400});
}