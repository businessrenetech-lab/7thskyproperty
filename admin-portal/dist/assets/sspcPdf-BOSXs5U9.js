const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/html2pdf-ekMMXuhg.js","assets/vendor-react-D-beFdsj.js"])))=>i.map(i=>d[i]);
import{_ as $}from"./index-Otx7Vlxk.js";import"./vendor-editor-BwiC-GYm.js";import"./vendor-react-D-beFdsj.js";import"./vendor-utils-CvNDeEjv.js";const y="#003768",v="#12b6f3",e=t=>String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function m(t,o){return`
  <div style="display:flex;align-items:center;gap:12px;border-bottom:4px solid ${v};padding-bottom:12px;margin-bottom:6px;">
    <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${y},${v});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;font-family:Arial;">7S</div>
    <div style="font-family:Arial;">
      <div style="font-size:17px;font-weight:800;color:${y};">Seventh Sky Property Care</div>
      <div style="font-size:11px;color:#64748b;">Property management &amp; care — Bangladesh</div>
    </div>
    <div style="margin-left:auto;text-align:right;font-family:Arial;">
      <div style="font-size:14px;font-weight:800;color:${y};">${e(t)}</div>
      <div style="font-size:11px;color:#64748b;">${e(o||"")}</div>
    </div>
  </div>`}const b=t=>t===!0?'<span style="color:#15803d;font-weight:700;">Yes</span>':t===!1?'<span style="color:#b91c1c;font-weight:700;">No</span>':'<span style="color:#94a3b8;">—</span>',c=t=>"৳"+Number(t||0).toLocaleString();async function w(t,o){const{default:p}=await $(async()=>{const{default:i}=await import("./html2pdf-ekMMXuhg.js").then(a=>a.h);return{default:i}},__vite__mapDeps([0,1])),d=document.createElement("div");return d.innerHTML=t,p().set({margin:[12,12,14,12],filename:o,image:{type:"jpeg",quality:.95},html2canvas:{scale:2,useCORS:!0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(d).outputPdf("blob")}async function P({receipt:t={},tenancy:o={},property:p={}}){const d=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),i=t.status==="paid",a=!i&&Number(t.amount_paid)>0,l=i?{t:"PAID",c:"#15803d",bg:"#dcfce7"}:a?{t:"PARTIAL",c:"#b45309",bg:"#fef3c7"}:{t:"DUE",c:"#b91c1c",bg:"#fee2e2"},f=(h,s,r={})=>`<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;${r.b?"font-weight:700;":""}${r.c?`color:${r.c};`:""}">${h}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;${r.b?"font-weight:700;":""}${r.c?`color:${r.c};`:""}">${c(s)}</td></tr>`,g=o.tenant?.full_name||"",x=`
  <div style="font-family:Arial;color:#0f172a;padding:6px;">
    ${m("Rent Receipt",`${e(t.receipt_code||"")} · ${d}`)}
    <table style="width:100%;font-size:12.5px;margin:8px 0;">
      <tr><td style="padding:3px 0;color:#64748b;width:120px;">Property</td><td style="font-weight:700;">${e(p.title||"")}</td>
          <td style="padding:3px 0;color:#64748b;width:90px;">Period</td><td style="font-weight:700;">${e(t.period_label||"")}</td></tr>
      <tr><td style="padding:3px 0;color:#64748b;">Tenant</td><td>${e(g)}</td>
          <td style="padding:3px 0;color:#64748b;">Status</td><td><span style="background:${l.bg};color:${l.c};padding:2px 10px;border-radius:6px;font-weight:800;font-size:11px;">${l.t}</span></td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">
      ${f("Monthly rent",t.rent_amount)}
      ${f("Service charge",t.service_charge)}
      ${f("Total",t.total_amount,{b:!0})}
      ${f("Amount paid",t.amount_paid,{c:"#15803d"})}
      ${f("Balance",t.balance,{b:!0,c:Number(t.balance)>0?"#b91c1c":"#15803d"})}
    </table>
    ${Number(t.balance)>0?`<p style="font-size:12.5px;color:#b45309;">Balance of ${c(t.balance)} remains due${t.due_date?` (due ${e(t.due_date)})`:""}.</p>`:'<p style="font-size:12.5px;color:#15803d;">Thank you — this period is fully paid.</p>'}
    <div style="margin-top:26px;display:flex;gap:40px;font-size:11.5px;">
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Received by — Seventh Sky Property Care</div>
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Date: ${d}</div>
    </div>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;">Computer-generated rent receipt. Retain for your records.</div>
  </div>`;return w(x,`rent-receipt-${t.receipt_code||"receipt"}.pdf`)}async function R({tenancy:t={},increment:o={},effective_date:p}){const d=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),i=[];Number(o.rent_to)>Number(o.rent_from)&&i.push(["Monthly rent",c(o.rent_from),c(o.rent_to)]),Number(o.service_to)>Number(o.service_from)&&i.push(["Service charge",c(o.service_from),c(o.service_to)]);const a=`
  <div style="font-family:Arial;color:#0f172a;padding:6px;">
    ${m("Rent / Service Review Notice",`${e(t.tenancy_code||"")} · ${d}`)}
    <p style="font-size:12.5px;">Dear ${e(t.tenant?.full_name||"Tenant")},</p>
    <p style="font-size:12.5px;">This is a formal notice of a review to the terms of your tenancy, taking effect on
    <b>${e(p||"the renewal date")}</b>:</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
      <thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:7px 9px;border:1px solid #e2e8f0;">Charge</th><th style="padding:7px 9px;border:1px solid #e2e8f0;">Current</th><th style="padding:7px 9px;border:1px solid #e2e8f0;">Revised</th></tr></thead>
      <tbody>${i.map(l=>`<tr><td style="padding:7px 9px;border:1px solid #e2e8f0;">${l[0]}</td><td style="text-align:center;padding:7px 9px;border:1px solid #e2e8f0;">${l[1]}</td><td style="text-align:center;padding:7px 9px;border:1px solid #e2e8f0;font-weight:700;">${l[2]}</td></tr>`).join("")}</tbody>
    </table>
    <p style="font-size:12.5px;">A renewal agreement reflecting these terms will follow for your review and electronic signature.
    Please contact us with any questions.</p>
    <p style="font-size:12.5px;margin-top:22px;">Yours sincerely,<br/><b>Seventh Sky Property Care</b></p>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;">This notice is issued as part of the tenancy's rent-review process under the tenancy agreement.</div>
  </div>`;return w(a,`rent-notice-${t.tenancy_code||"notice"}.pdf`)}async function D({assessment:t,property:o,fileSrc:p}){const d=t.items||[],i=[...new Set(d.map(s=>s.section||"General"))],a=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),l=i.map(s=>{const r=d.filter(n=>(n.section||"General")===s).map(n=>{const _=(Array.isArray(n.photos)?n.photos:[]).slice(0,4).map(u=>`<img src="${e(p?p(u):u)}" style="width:52px;height:40px;object-fit:cover;border-radius:4px;margin:1px;border:1px solid #e5e7eb;" />`).join("");return`<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${e(n.assessment_item)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${b(n.is_clean)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${b(n.is_undamaged)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${b(n.is_working)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${e(n.finding||n.notes||"")}</td>
        <td style="padding:4px;border:1px solid #e2e8f0;">${_}</td>
      </tr>`}).join("");return`
    <div class="room-block" style="margin-top:14px;">
      <div style="background:${y};color:#fff;font-weight:800;font-size:12.5px;padding:7px 10px;border-radius:6px 6px 0 0;font-family:Arial;">${e(s)}</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;text-align:left;width:26%;">Area item</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:9%;">Clean</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:11%;">Undamaged</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:9%;">Working</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;text-align:left;">Comment</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:20%;">Photos</th>
        </tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>`}).join(""),f=`
  <div style="padding:8px;font-family:Arial;color:#0f172a;">
    ${m("Property Assessment Report",`${t.assessment_code||""} · ${a}`)}
    <table style="width:100%;font-size:11.5px;margin-top:8px;font-family:Arial;">
      <tr>
        <td style="padding:3px 0;color:#64748b;width:110px;">Property</td><td style="font-weight:700;">${e(o?.title||"")}</td>
        <td style="padding:3px 0;color:#64748b;width:110px;">Address</td><td>${e([o?.address,o?.area,o?.city].filter(Boolean).join(", "))}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#64748b;">Assessment date</td><td>${e(t.assessment_date||a)}</td>
        <td style="padding:3px 0;color:#64748b;">Readiness</td><td style="font-weight:700;">${e(t.readiness_score??0)}% — ${e(String(t.readiness_status||"").replace(/_/g," "))}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#64748b;">Market rent</td><td>${e(t.market_rent_min||"—")} – ${e(t.market_rent_max||"—")}</td>
        <td style="padding:3px 0;color:#64748b;">Recommended rent</td><td style="font-weight:700;">${e(t.recommended_rent||"—")}</td>
      </tr>
    </table>
    ${t.summary?`<p style="font-size:11.5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">${e(t.summary)}</p>`:""}
    ${l}
    <div style="margin-top:26px;display:flex;gap:40px;font-family:Arial;font-size:11.5px;">
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Assessed by — Seventh Sky Property Care</div>
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Date: ${a}</div>
    </div>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;font-family:Arial;">Generated by the Seventh Sky property management system. This report forms part of the property's rental management records and may be attached to the owner's management agreement.</div>
  </div>`,{default:g}=await $(async()=>{const{default:s}=await import("./html2pdf-ekMMXuhg.js").then(r=>r.h);return{default:s}},__vite__mapDeps([0,1])),x=document.createElement("div");return x.innerHTML=f,await g().set({margin:[10,8,12,8],filename:`assessment-${t.assessment_code||t.id}.pdf`,image:{type:"jpeg",quality:.9},html2canvas:{scale:2,useCORS:!0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["avoid-all","css","legacy"]}}).from(x).outputPdf("blob")}export{D as buildAssessmentReportBlob,R as buildIncrementNoticeBlob,P as buildRentReceiptBlob};
