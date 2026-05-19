const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/html2pdf-CU0lLxV3.js","assets/vendor-react-B_1hzur8.js"])))=>i.map(i=>d[i]);
import{_ as B}from"./index-5VpNGzRE.js";import{l as E}from"./logo-WQCnS321.js";const $=async()=>(await B(async()=>{const{default:t}=await import("./html2pdf-CU0lLxV3.js").then(e=>e.h);return{default:t}},__vite__mapDeps([0,1]))).default,v=()=>({name:"Language Academy Bangladesh",address:"SEL SUFI SQUARE, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209",phone:"01820006677",email:"info@languageacademy.com.bd",website:"languageacademy.com.bd"});let w=null;const z=()=>new Promise(t=>{if(w){t(w);return}const e=new Image;e.crossOrigin="anonymous",e.onload=()=>{const o=document.createElement("canvas");o.width=e.width,o.height=e.height,o.getContext("2d").drawImage(e,0,0),w=o.toDataURL("image/png"),t(w)},e.onerror=()=>t(""),e.src=E}),A=t=>{if(t===0)return"Zero Taka Only";const e=["","One ","Two ","Three ","Four ","Five ","Six ","Seven ","Eight ","Nine ","Ten ","Eleven ","Twelve ","Thirteen ","Fourteen ","Fifteen ","Sixteen ","Seventeen ","Eighteen ","Nineteen "],o=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"],i=("000000000"+Math.floor(Math.abs(t))).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);if(!i)return String(t)+" Taka Only";let r="";return r+=i[1]!=0?(e[Number(i[1])]||o[i[1][0]]+" "+e[i[1][1]])+"Crore ":"",r+=i[2]!=0?(e[Number(i[2])]||o[i[2][0]]+" "+e[i[2][1]])+"Lakh ":"",r+=i[3]!=0?(e[Number(i[3])]||o[i[3][0]]+" "+e[i[3][1]])+"Thousand ":"",r+=i[4]!=0?(e[Number(i[4])]||o[i[4][0]]+" "+e[i[4][1]])+"Hundred ":"",r+=i[5]!=0?(r!==""?"and ":"")+(e[Number(i[5])]||o[i[5][0]]+" "+e[i[5][1]]):"",r.trim()+" Taka Only"},k=async(t,e)=>{const o=v(),i=await z();return`
    <div style="margin-bottom:0; padding:0;">
      <!-- Top Accent Bar -->
      <div style="height:5px; background:linear-gradient(90deg, #275fa7, #7bc62e); border-radius:3px 3px 0 0;"></div>
      
      <!-- Header Row -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px 14px; background:#fafbfc; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${i?`<img src="${i}" style="height:44px;" />`:""}
          <div>
            <div style="font-size:17px; font-weight:800; color:#275fa7; letter-spacing:0.5px; font-family:'Outfit','Inter',sans-serif;">LANGUAGE ACADEMY BANGLADESH</div>
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
  `},F=(t,e,o,i,r)=>{const m=d=>`BDT ${Number(d||0).toLocaleString()}`,s=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"-",l=["amount","due","debit","credit","balance"],n=o||((d,g)=>["amount","due","debit","credit","balance"].includes(d)?m(g):["date","due_date","start_date","expiry_date","enrollment_date"].includes(d)?s(g):g||"-"),f={};t.forEach(d=>{l.includes(d)&&(f[d]=e.reduce((g,h)=>g+Number(h[d]||0),0))});const y=e.length>0&&Object.keys(f).length>0,a="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",x="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:right; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",c=t.map(d=>`<th style="${l.includes(d)?x:a}">${d.replace(/_/g," ")}</th>`).join(""),u=e.map((d,g)=>{const h=g%2===0?"#ffffff":"#f8fafc",C=t.map(S=>`<td style="padding:9px 12px; font-size:11px; color:#334155; border-bottom:1px solid #eef2f6; ${l.includes(S)?"text-align:right; font-weight:600; font-variant-numeric:tabular-nums;":""} white-space:nowrap;">${n(S,d[S])}</td>`).join("");return`<tr style="background:${h};">${C}</tr>`}).join("");let p="";return y&&(p=`<tr>${t.map((g,h)=>h===0?`<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${e.length} records)</td>`:l.includes(g)?`<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">${m(f[g])}</td>`:'<td style="padding:10px 12px; border-top:2px solid #275fa7; background:#f0f7ff;"></td>').join("")}</tr>`),`
    <table style="width:100%; border-collapse:collapse; margin-top:0; border:1px solid #e2e8f0; border-radius:6px;">
      <thead>
        <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">${c}</tr>
      </thead>
      <tbody>${u}</tbody>
      ${p?`<tfoot>${p}</tfoot>`:""}
    </table>
  `},D=(t=["Created by","Received by","Approved by"])=>`
    <div style="display:flex; justify-content:space-between; margin-top:48px; padding-top:16px;">
      ${t.map(o=>`
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="border-bottom:1px solid #334155; width:100%; margin-bottom:8px; height:40px;"></div>
      <div style="font-size:11px; font-weight:600; color:#334155;">${o}</div>
    </div>
  `).join("")}
    </div>
  `,_=(t,e=.04)=>t?`
    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:0; pointer-events:none;">
      <img src="${t}" style="width:280px; height:280px; opacity:${e}; object-fit:contain;" />
    </div>
  `:"",T=async t=>{const e=v(),o=await z(),i=parseFloat(t.amount||0),r=A(Math.floor(i)),m=t.receipt_no||`RCP-${t.id}-${Date.now().toString().slice(-4)}`,s=t.paid_at?new Date(t.paid_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}),l=(t.method||"cash").toUpperCase(),b=t.Branch?.name||t.branch_name||"Head Office",n=t.source==="manual"||!t.enrollment_id&&t.invoice_id||t.Invoice?.invoice_type==="custom",f=n?t.Invoice?.customer_name||t.Invoice?.Customer?.name||t.customer_name||"Customer":t.Enrollment?.Student?.User?.name||t.Invoice?.Student?.User?.name||t.student_name||"Student",y=n?"Name":"Student Name",a=n?t.Invoice?.Customer?.company?` (${t.Invoice.Customer.company})`:"":` <span style="color:#64748b; font-weight:500;">(STU-${t.Enrollment?.student_id||t.Invoice?.student_id||t.student_id||"-"})</span>`,x=n?"For":"Course Name",c=n?t.Invoice?.IncomeCategory?.name||"Custom Income":t.Enrollment?.Batch?.Course?.title||t.course_name||"Tuition Fee",u=n?"":` <span style="color:#64748b; font-size:11px;">(Batch: ${t.Enrollment?.Batch?.code||t.batch_code||"-"})</span>`,p=n?t.Invoice?.notes||t.transaction_ref||"Custom Income Payment":t.transaction_ref?`Ref: ${t.transaction_ref}`:"Tuition Fee Payment";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${o?`<img src="${o}" style="height:48px;" />`:""}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY BANGLADESH</div>
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
        ${_(o,.04)}

        <!-- Receipt Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Receipt No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${m}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date / Time</div>
              <div style="font-size:13px; font-weight:600;">${s}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${b}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">${y}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#1e293b; border:1px solid #e2e8f0;">${f}${a}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">${x}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${c}${u}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${l}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${i.toLocaleString()}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${r}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Notes</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${p}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${D(["Created by","Received by","Approved by"])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `},H=async t=>{const e=await T(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[6,6,6,6],filename:`Receipt-${t.receipt_no||t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a5",orientation:"landscape"}};await(await $())().set(i).from(o).save()},L=async t=>{const e=v(),o=await z(),i=parseFloat(t.amount||0),r=parseFloat(t.paid||0),m=i-r,s=A(Math.floor(i)),l=t.issued_at?new Date(t.issued_at).toLocaleDateString("en-GB",{dateStyle:"medium"}):new Date().toLocaleDateString("en-GB",{dateStyle:"medium"}),b=t.due_date?new Date(t.due_date).toLocaleDateString("en-GB",{dateStyle:"medium"}):"N/A",n=t.invoice_type==="custom",f=n?t.customer_name||t.Customer?.name||"Customer":t.Student?.User?.name||t.Enrollment?.Student?.User?.name||"Student",y=n&&(t.customer_company||t.Customer?.company)||"",a=n&&(t.customer_phone||t.Customer?.phone)||"",x=n?t.customer_email||t.Customer?.email||"":t.Student?.User?.email||"",c=n&&(t.customer_address||t.Customer?.address)||"",u=n?t.IncomeCategory?.name||"Custom Income":t.Enrollment?.Batch?.Course?.title||"Tuition Fee",p={paid:"#10b981",pending:"#f59e0b",overdue:"#ef4444",partial:"#3b82f6",draft:"#64748b"}[t.status]||"#64748b";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:24px 32px 16px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${o?`<img src="${o}" style="height:52px;" />`:""}
          <div>
            <div style="font-size:20px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY BANGLADESH</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">${e.address}</div>
            <div style="font-size:10px; color:#64748b;">Phone: ${e.phone} | ${e.email}</div>
            <div style="font-size:10px; color:#64748b;">Web: ${e.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:800; color:#275fa7; letter-spacing:3px; border:2px solid #275fa7; padding:6px 18px; border-radius:6px;">INVOICE</div>
          <div style="margin-top:10px; font-size:12px; color:#64748b;">Invoice #: <strong style="color:#1e293b;">${t.invoice_no||"N/A"}</strong></div>
          <div style="font-size:12px; color:#64748b;">Date: <strong style="color:#1e293b;">${l}</strong></div>
          <div style="font-size:12px; color:#64748b;">Due: <strong style="color:#1e293b;">${b}</strong></div>
          <div style="margin-top:6px;"><span style="padding:4px 12px; border-radius:12px; font-size:11px; font-weight:700; background:${p}20; color:${p}; text-transform:uppercase;">${t.status}</span></div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:24px 32px; position:relative;">
        ${_(o,.03)}

        <!-- Bill To -->
        <div style="margin-bottom:24px; position:relative; z-index:1;">
          <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; font-weight:700;">Bill To</div>
          <div style="font-size:15px; font-weight:700; color:#1e293b;">${f}</div>
          ${y?`<div style="font-size:12px; color:#475569;">${y}</div>`:""}
          ${a?`<div style="font-size:12px; color:#64748b;">📱 ${a}</div>`:""}
          ${x?`<div style="font-size:12px; color:#64748b;">✉ ${x}</div>`:""}
          ${c?`<div style="font-size:12px; color:#64748b;">📍 ${c}</div>`:""}
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
                ${u}
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
              <td style="padding:8px 14px; font-size:13px; font-weight:600; text-align:right; color:#10b981; border:1px solid #e2e8f0;">৳${r.toLocaleString()}</td>
            </tr>
            <tr style="background:#f0f9ff;">
              <td style="padding:10px 14px; font-size:13px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">Balance Due</td>
              <td style="padding:10px 14px; font-size:16px; font-weight:800; text-align:right; color:#275fa7; border:1px solid #e2e8f0;">৳${m.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Amount in Words -->
        <div style="margin-top:16px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; position:relative; z-index:1;">
          <span style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Amount in Words: </span>
          <span style="font-size:12px; font-weight:600; color:#475569; text-transform:uppercase;">${s}</span>
        </div>

        <!-- Signatures -->
        ${D(["Prepared by","Received by","Authorized by"])}
      </div>

      <!-- Footer -->
      <div style="padding:10px 32px; border-top:1px solid #e2e8f0; text-align:center;">
        <div style="font-size:10px; color:#94a3b8;">Thank you for your business · ${e.name} · ${e.website}</div>
      </div>
      
      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7);"></div>
    </div>
  `},j=async t=>{const e=await L(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[8,8,8,8],filename:`Invoice-${t.invoice_no||t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}};await(await $())().set(i).from(o).save()},I=async t=>{const e=v(),o=await z(),i=parseFloat(t.amount||0),r=A(Math.floor(i)),m=`VCH-${t.id}-${Date.now().toString().slice(-4)}`,s=t.date?new Date(t.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),l=t.Branch?.name||t.branch_name||"Head Office",b=t.category||"Office Expense",n=(t.payment_method||"cash").replace(/_/g," ").toUpperCase(),f=t.description||"Office Expense";return`
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${o?`<img src="${o}" style="height:48px;" />`:""}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY BANGLADESH</div>
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
        ${_(o,.04)}

        <!-- Voucher Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Voucher No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${m}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date</div>
              <div style="font-size:13px; font-weight:600;">${s}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${l}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">Payee</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${b}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${n}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${i.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${r}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Reason / Description</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${f}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${D(["Created by","Checked by","Approved by"])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `},G=async t=>{const e=await I(t),o=document.createElement("div");o.innerHTML=e,o.style.background="white";const i={margin:[6,6,6,6],filename:`Voucher-${t.id}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a5",orientation:"landscape"}};await(await $())().set(i).from(o).save()},O=async(t,e)=>{const o=v(),i=e?.from&&e?.to?`Period: ${e.from} to ${e.to}`:`Generated: ${new Date().toLocaleDateString("en-GB",{dateStyle:"medium"})}`,r=await k("Expense Report",i),m=t.reduce((a,x)=>a+(x.status==="deleted"?0:parseFloat(x.amount||0)),0),s="padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;",l=t.map((a,x)=>{const c=a.status==="deleted",u=c?"line-through":"none",p=c?"#94a3b8":"#334155";return`
    <tr style="background:${x%2===0?"#ffffff":"#f8fafc"};">
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${p}; white-space:nowrap;">${a.date?new Date(a.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"-"}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${p};">
        <span style="text-decoration:${u}">${a.description||"-"}</span>
        ${c?`<div style="font-size:9px; color:#ef4444; margin-top:2px;">Reversed: ${a.deletion_reason||"N/A"}</div>`:""}
      </td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${p};">${a.category||"-"}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; text-align:right; font-weight:600; text-decoration:${u}; color:${p}; font-variant-numeric:tabular-nums;">৳${parseFloat(a.amount).toLocaleString()}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${p}; text-transform:capitalize;">${(a.payment_method||"").replace(/_/g," ")}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${c?"#ef4444":"#10b981"}; font-weight:600; text-transform:uppercase;">${c?"REVERSED":a.status}</td>
    </tr>`}).join(""),b=`
    <div style="font-family:'Inter','Segoe UI',sans-serif; background:#fff; color:#1e293b; padding:0;">
      ${r}
      <div style="padding:18px 24px 24px;">
        <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">
              <th style="${s} text-align:left;">Date</th>
              <th style="${s} text-align:left;">Description</th>
              <th style="${s} text-align:left;">Category</th>
              <th style="${s} text-align:right;">Amount</th>
              <th style="${s} text-align:left;">Method</th>
              <th style="${s} text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${l}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${t.filter(a=>a.status!=="deleted").length} active records)</td>
              <td style="padding:10px 12px; font-size:13px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">৳${m.toLocaleString()}</td>
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
  `,n=document.createElement("div");n.innerHTML=b,n.style.background="white";const f={margin:[8,8,8,8],filename:`Expense-Report-${new Date().toISOString().split("T")[0]}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:!0,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"}};await(await $())().set(f).from(n).save()};export{O as a,G as b,k as c,j as d,F as e,H as f,v as g};
