import React, { forwardRef } from 'react';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};

const StudentBookingFormPDF = forwardRef(({ student }, ref) => {
  if (!student) return null;

  // Safely resolve educational_details (may be a JSON string from API)
  const educationalDetails = (() => {
    const raw = student.educational_details;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
  })();

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
      <div ref={ref} style={{
        padding: '40px',
        fontFamily: "'Inter', sans-serif",
        color: '#1e293b',
        background: 'white',
        width: '794px', // A4 pixel width approx
        minHeight: '1123px' // A4 pixel height approx
      }}>
        {/* Header with Branding */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: '3px solid #7bc62e',
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <h1 style={{ color: '#275fa7', margin: '0 0 4px 0', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '1px' }}>Language Academy Bangladesh</h1>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>SEL SUFI SQUARE, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Phone: 01820006677 | info@languageacademy.com.bd | languageacademy.com.bd</div>
          <h2 style={{ color: '#64748b', margin: '0', fontSize: '18px', fontWeight: '500' }}>Student Admission Form</h2>
          <div style={{ marginTop: '15px', color: '#64748b', fontSize: '12px' }}>
            Reference: LA-STU-{student.id} | Date: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', gap: '30px' }}>
          {/* Left Column (Photo & Quick Info) */}
          <div style={{ width: '25%' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '8px',
              border: '2px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '20px',
              background: '#f8fafc'
            }}>
              {student.photograph_url ? (
                <img src={`http://localhost:5000${student.photograph_url}`} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Photo Here</span>
              )}
            </div>
            
            <div style={{ fontSize: '14px', color: '#475569' }}>
              <p style={{ margin: '5px 0' }}><strong>Enrollment:</strong></p>
              <p style={{ margin: '0 0 10px 0' }}>{formatDate(student.enrollment_date)}</p>
              
              <p style={{ margin: '5px 0' }}><strong>Target Level:</strong></p>
              <p style={{ margin: '0 0 10px 0' }}>{student.english_level ? student.english_level.toUpperCase() : 'N/A'}</p>
            </div>
          </div>

          {/* Right Column (Details) */}
          <div style={{ width: '75%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Personal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Full Name</strong><div style={{ fontSize: '14px', fontWeight: 600 }}>{student.User?.name || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Mobile No</strong><div style={{ fontSize: '14px' }}>{student.mobile_no || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Email Address</strong><div style={{ fontSize: '14px' }}>{student.User?.email || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Birth Date</strong><div style={{ fontSize: '14px' }}>{formatDate(student.date_of_birth)}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Father's Name</strong><div style={{ fontSize: '14px' }}>{student.father_name || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Mother's Name</strong><div style={{ fontSize: '14px' }}>{student.mother_name || 'N/A'}</div></div>
              <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>NID / Birth Cert</strong><div style={{ fontSize: '14px' }}>{student.nid_birth_cert || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Religion • Nationality</strong><div style={{ fontSize: '14px' }}>{student.religion || 'N/A'} • {student.nationality || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Gender</strong><div style={{ fontSize: '14px' }}>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Blood Group</strong><div style={{ fontSize: '14px' }}>{student.blood_group || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Marital Status</strong><div style={{ fontSize: '14px' }}>{student.marital_status ? student.marital_status.charAt(0).toUpperCase() + student.marital_status.slice(1) : 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Profession</strong><div style={{ fontSize: '14px' }}>{student.profession || 'N/A'}</div></div>
              </div>
            </section>

            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Emergency Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Contact Name</strong><div style={{ fontSize: '14px' }}>{student.emergency_contact_name || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Relation</strong><div style={{ fontSize: '14px' }}>{student.emergency_contact_relation || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Phone</strong><div style={{ fontSize: '14px' }}>{student.emergency_contact_phone || 'N/A'}</div></div>
              </div>
            </section>

            {educationalDetails.length > 0 && (
            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Educational Qualifications</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Exam</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Institution</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Year</th>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {educationalDetails.map((ed, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{ed.exam_name}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{ed.institution_name}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{ed.passing_year}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{ed.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            )}

            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Course Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Enrolled Course</strong><div style={{ fontSize: '14px', fontWeight: 600 }}>{student.Batch?.Course?.title || 'Not Assigned'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Batch Code</strong><div style={{ fontSize: '14px' }}>{student.Batch?.code || 'Not Assigned'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Schedule</strong><div style={{ fontSize: '14px' }}>{student.Batch?.schedule || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Plan Type</strong><div style={{ fontSize: '14px' }}>{(student.plan_type || 'free').toUpperCase()}</div></div>
              </div>
            </section>

            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Passport & Travel</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Passport No</strong><div style={{ fontSize: '14px' }}>{student.passport_no || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Expiry Date</strong><div style={{ fontSize: '14px' }}>{formatDate(student.passport_expiry)}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Visa Status</strong><div style={{ fontSize: '14px' }}>{student.visa_status || 'N/A'}</div></div>
              </div>
            </section>

            <section>
              <h3 style={{ color: '#275fa7', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginTop: 0 }}>Addresses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Present Address</strong><div style={{ fontSize: '14px' }}>{student.current_address || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Permanent Address</strong><div style={{ fontSize: '14px' }}>{student.permanent_address || 'N/A'}</div></div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer info & Signature */}
        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '5px' }}></div>
            Student Signature
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '5px' }}></div>
            Authorized Signature
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
          This is a system generated document. Language Academy Bangladesh &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
});

export default StudentBookingFormPDF;
