"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Download, Loader2, RefreshCw, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

export default function CertificatesPage() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
  const load=useCallback(async()=>{setLoading(true);try{setItems(await apiFetch("/certificates/requests"));}catch(e){setMessage(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  async function review(item,status){
    const conduct=item.certificate_type==="character"&&status==="approved" ? window.prompt("Conduct", "Good") : null;
    const remarks=window.prompt(status==="rejected"?"Rejection reason":"Remarks (optional)","");
    if(remarks===null)return;
    try{await apiFetch(`/certificates/requests/${item.id}/review`,{method:"PUT",body:JSON.stringify({status,conduct,remarks})});setMessage(`Request ${status}`);load();}catch(e){setMessage(e.message);}
  }
  async function download(id,number){const token=document.cookie.match(/(^| )token=([^;]+)/)?.[2];const origin=(process.env.NEXT_PUBLIC_API_URL||"http://localhost:5000").replace(/\/$/,"");const res=await fetch(`${origin}/api/certificates/${id}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok){setMessage((await res.json()).message);return;}const url=URL.createObjectURL(await res.blob());const a=document.createElement("a");a.href=url;a.download=`${number}.pdf`;a.click();URL.revokeObjectURL(url);}
  return <div className="portal-saffron flex min-h-screen bg-gray-50"><Sidebar/><main className="min-w-0 flex-1 p-5 lg:p-8"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Certificate Requests</h1><p className="text-sm text-gray-500">Review Character and Transfer Certificates</p></div><button onClick={load} className="rounded-xl border p-2"><RefreshCw size={18}/></button></div>{message&&<p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}<div className="mt-5 overflow-x-auto rounded-2xl border bg-white">{loading?<Loader2 className="mx-auto my-20 animate-spin"/>:<table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50"><tr>{["Student","Type","Reason / Destination","Clearance","Status","Action"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{items.map(item=><tr key={item.id}><td className="px-4 py-4 font-semibold">{item.student_name}<p className="text-xs font-normal text-gray-400">{item.admission_number}</p></td><td className="px-4 capitalize">{item.certificate_type}</td><td className="px-4">{item.reason||"-"}{item.destination_school&&<p className="text-xs text-gray-500">To: {item.destination_school}</p>}</td><td className="px-4">{item.certificate_type==="transfer"?<span className={item.clearance?.all_clear?"text-green-600":"text-red-600"}>{item.clearance?.all_clear?"All clear":`Fees: Rs ${item.clearance?.fee_due||0}, Library: ${item.clearance?.library_open||0}`}</span>:"Not required"}</td><td className="px-4 capitalize">{item.status}</td><td className="px-4"><div className="flex gap-2">{item.status==="pending"&&<><button onClick={()=>review(item,"approved")} className="rounded-lg bg-green-50 p-2 text-green-700"><CheckCircle size={16}/></button><button onClick={()=>review(item,"rejected")} className="rounded-lg bg-red-50 p-2 text-red-700"><XCircle size={16}/></button></>}{item.status==="approved"&&<button onClick={()=>download(item.id,item.certificate_number)} className="rounded-lg bg-blue-50 p-2 text-blue-700"><Download size={16}/></button>}</div></td></tr>)}</tbody></table>}</div></main></div>;
}
