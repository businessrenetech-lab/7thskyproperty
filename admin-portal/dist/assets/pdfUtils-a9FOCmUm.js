const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/html2pdf-f8nV2Kjx.js","assets/index-Bym8F65Q.js","assets/index-94wA2vyJ.css"])))=>i.map(i=>d[i]);
import{_ as Y}from"./index-Bym8F65Q.js";import{l as q}from"./logo-WQCnS321.js";const N=async()=>(await Y(async()=>{const{default:t}=await import("./html2pdf-f8nV2Kjx.js").then(e=>e.h);return{default:t}},__vite__mapDeps([0,1,2]))).default,I=()=>({name:"Language Academy",address:"SEL SUFI SQUARE, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209",phone:"+880 1913-373581",email:"hello@languageacademy.com.bd",website:"languageacademy.com.bd"});let L=null;const P=()=>new Promise(t=>{if(L){t(L);return}const e=new Image;e.crossOrigin="anonymous",e.onload=()=>{const o=document.createElement("canvas");o.width=e.width,o.height=e.height,o.getContext("2d").drawImage(e,0,0),L=o.toDataURL("image/png"),t(L)},e.onerror=()=>t(""),e.src=q}),F=t=>{if(t===0)return"Zero Taka Only";const e=["","One ","Two ","Three ","Four ","Five ","Six ","Seven ","Eight ","Nine ","Ten ","Eleven ","Twelve ","Thirteen ","Fourteen ","Fifteen ","Sixteen ","Seventeen ","Eighteen ","Nineteen "],o=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"],i=("000000000"+Math.floor(Math.abs(t))).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);if(!i)return String(t)+" Taka Only";let a="";return a+=i[1]!=0?(e[Number(i[1])]||o[i[1][0]]+" "+e[i[1][1]])+"Crore ":"",a+=i[2]!=0?(e[Number(i[2])]||o[i[2][0]]+" "+e[i[2][1]])+"Lakh ":"",a+=i[3]!=0?(e[Number(i[3])]||o[i[3][0]]+" "+e[i[3][1]])+"Thousand ":"",a+=i[4]!=0?(e[Number(i[4])]||o[i[4][0]]+" "+e[i[4][1]])+"Hundred ":"",a+=i[5]!=0?(a!==""?"and ":"")+(e[Number(i[5])]||o[i[5][0]]+" "+e[i[5][1]]):"",a.trim()+" Taka Only"},K=async(t,e)=>{const o=I(),i=await P();return`
    <div style="margin-bottom:0; padding:0;">
      <!-- Top Accent Bar -->
      <div style="height:5px; background:linear-gradient(90deg, #275fa7, #7bc62e); border-radius:3px 3px 0 0;"></div>
      
      <!-- Header Row -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px 14px; background:#fafbfc; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${i?`<img src="${i}" style="height:44px;" />`:""}
          <div>
            <div style="font-size:17px; font-weight:800; color:#275fa7; letter-spacing:0.5px; font-family:'Outfit','Inter',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b; margin-top:2px;">${o.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${o.phone} | ${o.email} | ${o.website}</div>
          </div>
        </div>
        ${t?`
        <div style="text-align:right;">
          <div style="font-size:15px; font-weight:700; color:#275fa7; border:2px solid #275fa7; padding:5px 18px; border-radius:6px; letter-spacing:1px; text-transform:uppercase;">${t}</div>
          ${e?`<div style="font-size:10px; color:#64748b; margin-top:6px;">${e}</div>`:""}
        </div>
        `:""}
      </div>
    </div>
  `},et=(t,e,o,i,a)=>{const b=n=>`BDT ${Number(n||0).toLocaleString()}`,p=n=>n?new Date(n).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"-",c=["amount","due","debit","credit","balance"],r=o||((n,s)=>["amount","due","debit","credit","balance"].includes(n)?b(s):["date","due_date","start_date","expiry_date","enrollment_date"].includes(n)?p(s):s||"-"),x={};t.forEach(n=>{c.includes(n)&&(x[n]=e.reduce((s,m)=>s+Number(m[n]||0),0))});const u=e.length>0&&Object.keys(x).length>0,d="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",g="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:right; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",f=t.map(n=>`<th style="${c.includes(n)?g:d}">${n.replace(/_/g," ")}</th>`).join(""),v=e.map((n,s)=>{const m=s%2===0?"#ffffff":"#f8fafc",w=t.map(y=>`<td style="padding:9px 12px; font-size:11px; color:#334155; border-bottom:1px solid #eef2f6; ${c.includes(y)?"text-align:right; font-weight:600; font-variant-numeric:tabular-nums;":""} white-space:nowrap;">${r(y,n[y])}</td>`).join("");return`<tr style="background:${m};">${w}</tr>`}).join("");let l="";return u&&(l=`<tr>${t.map((s,m)=>m===0?`<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${e.length} records)</td>`:c.includes(s)?`<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">${b(x[s])}</td>`:'<td style="padding:10px 12px; border-top:2px solid #275fa7; background:#f0f7ff;"></td>').join("")}</tr>`),`
    <table style="width:100%; border-collapse:collapse; margin-top:0; border:1px solid #e2e8f0; border-radius:6px;">
      <thead>
        <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">${f}</tr>
      </thead>
      <tbody>${v}</tbody>
      ${l?`<tfoot>${l}</tfoot>`:""}
    </table>
  `},j=(t=["Created by","Received by","Approved by"])=>`
    <div style="display:flex; justify-content:space-between; margin-top:48px; padding-top:16px;">
      ${t.map(o=>`
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="border-bottom:1px solid #334155; width:100%; margin-bottom:8px; height:40px;"></div>
      <div style="font-size:11px; font-weight:600; color:#334155;">${o}</div>
    </div>
  `).join("")}
    </div>
  `,O=(t,e=.04)=>t?`
    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:0; pointer-events:none;">
      <img src="${t}" style="width:280px; height:280px; opacity:${e}; object-fit:contain;" />
    </div>
  `:"",Q=async t=>{var n,s,m,w,y,$,z,S,_,C,D,A,k,T,B,E,R,H,G,U,M,V,W;const e=I(),o=await P(),i=parseFloat(t.amount||0),a=F(Math.floor(i)),b=t.receipt_no||`RCP-${t.id}-${Date.now().toString().slice(-4)}`,p=t.paid_at?new Date(t.paid_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}),c=(t.method||"cash").toUpperCase(),h=((n=t.Branch)==null?void 0:n.name)||t.branch_name||"Head Office",r=t.source==="manual"||!t.enrollment_id&&t.invoice_id||((s=t.Invoice)==null?void 0:s.invoice_type)==="custom",x=r?((m=t.Invoice)==null?void 0:m.customer_name)||((y=(w=t.Invoice)==null?void 0:w.Customer)==null?void 0:y.name)||t.customer_name||"Customer":((S=(z=($=t.Enrollment)==null?void 0:$.Student)==null?void 0:z.User)==null?void 0:S.name)||((D=(C=(_=t.Invoice)==null?void 0:_.Student)==null?void 0:C.User)==null?void 0:D.name)||t.student_name||"Student",u=r?"Name":"Student Name",d=r?(k=(A=t.Invoice)==null?void 0:A.Customer)!=null&&k.company?` (${t.Invoice.Customer.company})`:"":` <span style="color:#64748b; font-weight:500;">(STU-${((T=t.Enrollment)==null?void 0:T.student_id)||((B=t.Invoice)==null?void 0:B.student_id)||t.student_id||"-"})</span>`,g=r?"For":"Course Name",f=r?((R=(E=t.Invoice)==null?void 0:E.IncomeCategory)==null?void 0:R.name)||"Custom Income":((U=(G=(H=t.Enrollment)==null?void 0:H.Batch)==null?void 0:G.Course)==null?void 0:U.title)||t.course_name||"Tuition Fee",v=r?"":` <span style="color:#64748b; font-size:11px;">(Batch: ${((V=(M=t.Enrollment)==null?void 0:M.Batch)==null?void 0:V.code)||t.batch_code||"-"})</span>`,l=r?((W=t.Invoice)==null?void 0:W.notes)||t.transaction_ref||"Custom Income Payment":t.transaction_ref?`Ref: ${t.transaction_ref}`:"Tuition Fee Payment";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${o?`<img src="${o}" style="height:48px;" />`:""}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b;">${e.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${e.phone} | ${e.email} | ${e.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px; font-weight:800; color:#275fa7; letter-spacing:2px; border:2px solid #275fa7; padding:4px 14px; border-radius:6px;">MONEY RECEIPT</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px 28px; position:relative;">
        ${O(o,.04)}

        <!-- Receipt Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Receipt No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${b}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date / Time</div>
              <div style="font-size:13px; font-weight:600;">${p}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${h}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">${u}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#1e293b; border:1px solid #e2e8f0;">${x}${d}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">${g}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${f}${v}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${c}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${i.toLocaleString()}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${a}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Notes</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${l}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${j(["Created by","Received by","Approved by"])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `},ot=async t=>{const e=await Q(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[6,6,6,6],filename:`Receipt-${t.receipt_no||t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a5",orientation:"landscape"}};await(await N())().set(i).from(o).save()},Z=async t=>{var n,s,m,w,y,$,z,S,_,C,D,A,k,T,B,E;const e=I(),o=await P(),i=parseFloat(t.amount||0),a=parseFloat(t.paid||0),b=i-a,p=F(Math.floor(i)),c=t.issued_at?new Date(t.issued_at).toLocaleDateString("en-GB",{dateStyle:"medium"}):new Date().toLocaleDateString("en-GB",{dateStyle:"medium"}),h=t.due_date?new Date(t.due_date).toLocaleDateString("en-GB",{dateStyle:"medium"}):"N/A",r=t.invoice_type==="custom",x=r?t.customer_name||((n=t.Customer)==null?void 0:n.name)||"Customer":((m=(s=t.Student)==null?void 0:s.User)==null?void 0:m.name)||(($=(y=(w=t.Enrollment)==null?void 0:w.Student)==null?void 0:y.User)==null?void 0:$.name)||"Student",u=r&&(t.customer_company||((z=t.Customer)==null?void 0:z.company))||"",d=r&&(t.customer_phone||((S=t.Customer)==null?void 0:S.phone))||"",g=r?t.customer_email||((_=t.Customer)==null?void 0:_.email)||"":((D=(C=t.Student)==null?void 0:C.User)==null?void 0:D.email)||"",f=r&&(t.customer_address||((A=t.Customer)==null?void 0:A.address))||"",v=r?((k=t.IncomeCategory)==null?void 0:k.name)||"Custom Income":((E=(B=(T=t.Enrollment)==null?void 0:T.Batch)==null?void 0:B.Course)==null?void 0:E.title)||"Tuition Fee",l={paid:"#10b981",pending:"#f59e0b",overdue:"#ef4444",partial:"#3b82f6",draft:"#64748b"}[t.status]||"#64748b";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:24px 32px 16px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${o?`<img src="${o}" style="height:52px;" />`:""}
          <div>
            <div style="font-size:20px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">${e.address}</div>
            <div style="font-size:10px; color:#64748b;">Phone: ${e.phone} | ${e.email}</div>
            <div style="font-size:10px; color:#64748b;">Web: ${e.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:800; color:#275fa7; letter-spacing:3px; border:2px solid #275fa7; padding:6px 18px; border-radius:6px;">INVOICE</div>
          <div style="margin-top:10px; font-size:12px; color:#64748b;">Invoice #: <strong style="color:#1e293b;">${t.invoice_no||"N/A"}</strong></div>
          <div style="font-size:12px; color:#64748b;">Date: <strong style="color:#1e293b;">${c}</strong></div>
          <div style="font-size:12px; color:#64748b;">Due: <strong style="color:#1e293b;">${h}</strong></div>
          <div style="margin-top:6px;"><span style="padding:4px 12px; border-radius:12px; font-size:11px; font-weight:700; background:${l}20; color:${l}; text-transform:uppercase;">${t.status}</span></div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:24px 32px; position:relative;">
        ${O(o,.03)}

        <!-- Bill To -->
        <div style="margin-bottom:24px; position:relative; z-index:1;">
          <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; font-weight:700;">Bill To</div>
          <div style="font-size:15px; font-weight:700; color:#1e293b;">${x}</div>
          ${u?`<div style="font-size:12px; color:#475569;">${u}</div>`:""}
          ${d?`<div style="font-size:12px; color:#64748b;">📱 ${d}</div>`:""}
          ${g?`<div style="font-size:12px; color:#64748b;">✉ ${g}</div>`:""}
          ${f?`<div style="font-size:12px; color:#64748b;">📍 ${f}</div>`:""}
        </div>

        <!-- Items Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; position:relative; z-index:1;">
          <thead>
            <tr style="background:#275fa7;">
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">#</th>
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">Description</th>
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:right; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#f8fafc;">
              <td style="padding:12px 14px; font-size:12px; border:1px solid #e2e8f0;">1</td>
              <td style="padding:12px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">
                ${v}
                ${t.notes?`<div style="font-size:11px; color:#64748b; margin-top:4px;">${t.notes}</div>`:""}
              </td>
              <td style="padding:12px 14px; font-size:14px; font-weight:700; color:#1e293b; border:1px solid #e2e8f0; text-align:right;">৳${i.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex; justify-content:flex-end; position:relative; z-index:1;">
          <table style="width:260px; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 14px; font-size:12px; font-weight:600; color:#64748b; border:1px solid #e2e8f0;">Subtotal</td>
              <td style="padding:8px 14px; font-size:13px; font-weight:600; text-align:right; border:1px solid #e2e8f0;">৳${i.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 14px; font-size:12px; font-weight:600; color:#10b981; border:1px solid #e2e8f0;">Paid</td>
              <td style="padding:8px 14px; font-size:13px; font-weight:600; text-align:right; color:#10b981; border:1px solid #e2e8f0;">৳${a.toLocaleString()}</td>
            </tr>
            <tr style="background:#f0f9ff;">
              <td style="padding:10px 14px; font-size:13px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">Balance Due</td>
              <td style="padding:10px 14px; font-size:16px; font-weight:800; text-align:right; color:#275fa7; border:1px solid #e2e8f0;">৳${b.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Amount in Words -->
        <div style="margin-top:16px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; position:relative; z-index:1;">
          <span style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Amount in Words: </span>
          <span style="font-size:12px; font-weight:600; color:#475569; text-transform:uppercase;">${p}</span>
        </div>

        <!-- Signatures -->
        ${j(["Prepared by","Received by","Authorized by"])}
      </div>

      <!-- Footer -->
      <div style="padding:10px 32px; border-top:1px solid #e2e8f0; text-align:center;">
        <div style="font-size:10px; color:#94a3b8;">Thank you for your business · ${e.name} · ${e.website}</div>
      </div>
      
      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7);"></div>
    </div>
  `},it=async t=>{const e=await Z(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[8,8,8,8],filename:`Invoice-${t.invoice_no||t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}};await(await N())().set(i).from(o).save()},J=async t=>{var u;const e=I(),o=await P(),i=parseFloat(t.amount||0),a=F(Math.floor(i)),b=`VCH-${t.id}-${Date.now().toString().slice(-4)}`,p=t.date?new Date(t.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),c=((u=t.Branch)==null?void 0:u.name)||t.branch_name||"Head Office",h=t.category||"Office Expense",r=(t.payment_method||"cash").replace(/_/g," ").toUpperCase(),x=t.description||"Office Expense";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${o?`<img src="${o}" style="height:48px;" />`:""}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b;">${e.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${e.phone} | ${e.email} | ${e.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px; font-weight:800; color:#275fa7; letter-spacing:2px; border:2px solid #275fa7; padding:4px 14px; border-radius:6px;">MONEY VOUCHER</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px 28px; position:relative;">
        ${O(o,.04)}

        <!-- Voucher Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Voucher No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${b}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date</div>
              <div style="font-size:13px; font-weight:600;">${p}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${c}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">Payee</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${h}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${r}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${i.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${a}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Reason / Description</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${x}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${j(["Created by","Checked by","Approved by"])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `},nt=async t=>{const e=await J(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[6,6,6,6],filename:`Voucher-${t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a5",orientation:"landscape"}};await(await N())().set(i).from(o).save()},rt=async(t,e)=>{const o=I(),i=e!=null&&e.from&&(e!=null&&e.to)?`Period: ${e.from} to ${e.to}`:`Generated: ${new Date().toLocaleDateString("en-GB",{dateStyle:"medium"})}`,a=await K("Expense Report",i),b=t.reduce((d,g)=>d+(g.status==="deleted"?0:parseFloat(g.amount||0)),0),p="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",c=t.map((d,g)=>{const f=d.status==="deleted",v=f?"line-through":"none",l=f?"#94a3b8":"#334155";return`
    <tr style="background:${g%2===0?"#ffffff":"#f8fafc"};">
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${l}; white-space:nowrap;">${d.date?new Date(d.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"-"}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${l};">
        <span style="text-decoration:${v}">${d.description||"-"}</span>
        ${f?`<div style="font-size:9px; color:#ef4444; margin-top:2px;">Reversed: ${d.deletion_reason||"N/A"}</div>`:""}
      </td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${l};">${d.category||"-"}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; text-align:right; font-weight:600; text-decoration:${v}; color:${l}; font-variant-numeric:tabular-nums;">৳${parseFloat(d.amount).toLocaleString()}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${l}; text-transform:capitalize;">${(d.payment_method||"").replace(/_/g," ")}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${f?"#ef4444":"#10b981"}; font-weight:600; text-transform:uppercase;">${f?"REVERSED":d.status}</td>
    </tr>`}).join(""),h=`
    <div style="font-family:'Inter','Segoe UI',sans-serif; background:#fff; color:#1e293b; padding:0;">
      ${a}
      <div style="padding:18px 24px 24px;">
        <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">
              <th style="${p} text-align:left;">Date</th>
              <th style="${p} text-align:left;">Description</th>
              <th style="${p} text-align:left;">Category</th>
              <th style="${p} text-align:right;">Amount</th>
              <th style="${p} text-align:left;">Method</th>
              <th style="${p} text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${c}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${t.filter(d=>d.status!=="deleted").length} active records)</td>
              <td style="padding:10px 12px; font-size:13px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">৳${b.toLocaleString()}</td>
              <td colspan="2" style="border-top:2px solid #275fa7; background:#f0f7ff;"></td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div style="margin-top:28px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:9px; color:#94a3b8;">Generated on ${new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</div>
          <div style="font-size:9px; color:#94a3b8;">${o.name} Finance System · ${o.website}</div>
        </div>
      </div>
      <!-- Bottom Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #7bc62e, #275fa7); border-radius:0 0 3px 3px;"></div>
    </div>
  `,r=document.createElement("div");r.innerHTML=h,r.style.background="white";const x={margin:[8,8,8,8],filename:`Expense-Report-${new Date().toISOString().split("T")[0]}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"}};await(await N())().set(x).from(r).save()};export{rt as a,nt as b,K as c,it as d,et as e,ot as f,I as g,Q as h};
