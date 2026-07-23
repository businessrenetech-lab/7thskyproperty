import React, { forwardRef } from 'react';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};

const CertificatePDF = forwardRef(({ student }, ref) => {
  if (!student) return null;

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
      <div ref={ref} style={{
        padding: '60px',
        fontFamily: "'Inter', sans-serif",
        color: '#1e293b',
        background: '#f8fafc',
        width: '1123px', // A4 landscape width approx
        minHeight: '794px', // A4 landscape height approx
        border: '15px solid #003768',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        {/* Inner Border */}
        <div style={{
          border: '5px solid #1bbdf1',
          position: 'absolute',
          top: '30px',
          bottom: '30px',
          left: '30px',
          right: '30px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Header with Branding */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ color: '#003768', margin: '0 0 10px 0', fontSize: '48px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>Language Academy</h1>
            <h2 style={{ color: '#1bbdf1', margin: '0', fontSize: '24px', fontWeight: '600', letterSpacing: '4px', textTransform: 'uppercase' }}>Certificate of Achievement</h2>
          </div>

          <p style={{ fontSize: '18px', color: '#64748b', marginTop: '20px' }}>This is to certify that</p>
          
          <h1 style={{ fontSize: '56px', color: '#0f172a', margin: '20px 0 10px 0', fontWeight: 700, fontStyle: 'italic' }}>
            {student.User?.name || 'Student Name'}
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', width: '100%', maxWidth: '600px', margin: '15px 0' }}>
            <div style={{ fontSize: '16px', color: '#475569', textAlign: 'right' }}>
              <strong>Father's Name:</strong> {student.father_name || 'N/A'}
            </div>
            <div style={{ fontSize: '16px', color: '#475569', textAlign: 'left' }}>
              <strong>Mother's Name:</strong> {student.mother_name || 'N/A'}
            </div>
          </div>

          <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '800px', lineHeight: '1.6', margin: '20px 0' }}>
            has successfully completed the course 
            <br />
            <strong style={{ fontSize: '24px', color: '#003768', display: 'block', margin: '15px 0' }}>{student.Batch?.Course?.title || 'Unknown Course'}</strong>
            (Batch: {student.Batch?.code || 'N/A'}) with a course duration of <strong>{student.Batch?.Course?.duration_weeks ? `${student.Batch?.Course?.duration_weeks} Weeks` : 'N/A'}</strong>.
          </p>

          <p style={{ fontSize: '18px', color: '#475569', marginTop: '10px' }}>
            <strong>Passing Date:</strong> {formatDate(student.course_completion_date || student.Batch?.end_date || new Date())}
          </p>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 50px', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #003768', width: '200px', marginBottom: '10px' }}></div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#003768' }}>Course Instructor</p>
            </div>
            
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: '#003768', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
              border: '4px solid #1bbdf1',
              transform: 'rotate(-15deg)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              SEAL
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #003768', width: '200px', marginBottom: '10px' }}></div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#003768' }}>Managing Director</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CertificatePDF;
