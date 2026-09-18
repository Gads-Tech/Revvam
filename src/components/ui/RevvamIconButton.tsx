"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export default function RevvamIconButton({children,label,className="",...props}:{children:ReactNode;label:string}&ButtonHTMLAttributes<HTMLButtonElement>){
 return <button type="button" aria-label={label} title={label} className={`inline-flex items-center justify-center rounded-xl text-white/45 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-300 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400/50 ${className}`} {...props}>{children}</button>;
}