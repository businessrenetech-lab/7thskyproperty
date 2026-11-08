/**
 * Every list the client's HRM spec (docs/hrm/requirements-v0.1.txt) enumerates, with its labels copied exactly.
 * Section references: M2 = Employee Master Database, M3 = Recruitment & ATS.
 */
module.exports = {
  // M2 §2
  EMPLOYEE_TYPES: [
    'Full-time employee', 'Part-time employee', 'Casual employee', 'Contract employee', 'Intern', 'Consultant',
    'Remote worker', 'Field staff', 'Probationary employee', 'Third-party assigned worker', 'Temporary worker',
  ],
  // M2 §3.3
  EMPLOYMENT_STATUSES: [
    'Applicant', 'Offer Accepted', 'Onboarding', 'Active', 'Probation', 'Confirmed', 'Suspended', 'Resigned',
    'Terminated', 'Retired', 'Deceased', 'Inactive',
  ],
  // Statuses that hold a seat in a position (headcount, vacancies).
  SEAT_HOLDING_STATUSES: ['Onboarding', 'Active', 'Probation', 'Confirmed', 'Suspended'],
  // M2 §5
  LIFECYCLE_STAGES: [
    'Candidate', 'Offer Accepted', 'Onboarding', 'Probation', 'Active Employee', 'Confirmed Employee',
    'Promotion / Transfer', 'Resignation / Termination', 'Offboarding', 'Inactive Archive',
  ],
  // M2 §3.5
  DOCUMENT_TYPES: [
    'CV', 'National ID', 'Passport', 'Photo', 'Offer Letter', 'Employment Agreement', 'Appointment Letter',
    'Educational Certificates', 'Professional Certificates', 'Police Clearance', 'Medical Certificate', 'Tax Documents',
    'Bank Details', 'Emergency Contact Form', 'Policy Acknowledgement', 'Training Certificates', 'Licence Copies',
    'Warning Letters', 'Performance Reviews', 'Resignation Letter', 'Exit Documents',
  ],
  // M3 §10
  APPLICANT_STATUSES: [
    'Application Received', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Interview Completed',
    'Assessment Pending', 'Assessment Completed', 'Reference Check', 'Offer Pending', 'Offer Sent', 'Offer Accepted',
    'Offer Declined', 'Not Selected', 'Talent Pool',
  ],
  // M3 §4
  PRIORITIES: ['Critical', 'High', 'Normal', 'Future'],
  // M3 §12
  INTERVIEW_TYPES: ['Phone Interview', 'Online Interview', 'Face-to-Face Interview', 'Panel Interview', 'Final Interview'],
  // M3 §13
  COMPETENCIES: [
    'Communication', 'Technical Knowledge', 'Problem Solving', 'Customer Service', 'Teamwork', 'Leadership Potential',
    'Professionalism', 'Motivation', 'Cultural Fit',
  ],
  RECOMMENDATIONS: ['Highly Recommended', 'Recommended', 'Consider', 'Not Recommended'],
  // M3 §14
  CHECK_TYPES: [
    'Reference Checks', 'Identity Verification', 'Qualification Verification', 'Professional Licence Verification',
    'Police Clearance', 'Medical Assessment', 'Right to Work Verification',
  ],
  // M3 §7
  CHANNELS: ['Seventh Sky Website', 'Careers Portal', 'LinkedIn', 'Facebook', 'Bdjobs', 'Email Campaigns', 'Internal Vacancy Board'],
};
