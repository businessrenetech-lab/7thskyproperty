# HRM requirements coverage (client spec V0.1)

Every section of *Seventh Sky CRM – HRM System V0.1* (`docs/hrm/requirements-v0.1.txt`), with the design window
that shows it (`docs/design/hrm-screens.png`, numbered as on the board) and the plan task that builds it
(`docs/hrm/2026-10-30-hrm-plan.md`). Checked 30 Oct 2026.

**Status key:** **Built** = running in the app today. **Designed + planned** = drawn and has a build task.
**Planned** = has a build task but needs no screen of its own.

Design windows:
1. Dashboard: People
2. Organisation structure
3. Org chart
4. Employees
5. Employee profile
6. Approvals
7. Recruitment pipeline
8. Candidate
9. Careers application (public)
10. My profile
11. Dashboard: Organisation
12. Dashboard: Recruitment
13. Company and divisions
14. Position and job description
15. Vacancy request
16. Onboarding
17. New employee
18. My team
19. Reports
20. Talent pool
21. Offer acceptance (public)

## Module 1: Organisation Structure

| § | Requirement | Window | Task | Status |
|---|---|---|---|---|
| 1 | Company, divisions, departments, branches, teams, positions, reporting lines, managers, cost centres, future expansion | 2, 13 | 1, 5 | Designed + planned |
| 2 | Add, edit, deactivate and restructure without a developer (17 example units, none hard-coded) | 2, 13 | 5, 8 | Designed + planned |
| 3 | Company → Division → Department → Team → Position → Employee | 2, 3 | 1, 2 | Designed + planned |
| 4.1 | Company profile: name, trading name, registration no., TIN, BIN, address, contact, logo, divisions, branches, policies | 13 | 1, 5, 8 | Designed + planned |
| 4.2 | Division: name, head, code, business function, active/inactive (4 example divisions with websites) | 13 | 1, 5 | Designed + planned |
| 4.3 | Department: name, code, division, manager, location, cost centre, active/inactive | 2 | 1, 5 | Designed + planned |
| 4.4 | Position: title, code, department, reports to, employment type, salary grade, JD, qualifications, experience, skills, approval authority, active/inactive | 14 | 1, 5 | Designed + planned |
| 4.5 | Supervisor → department manager → division head → CEO on each profile; managers see their reports | 5, 17, 18 | 11 | Designed + planned |
| 5 | Visual org chart (company, divisions, departments, managers, positions, employees); filters: division, department, branch, position, manager, status | 3 | 2, 8 | Designed + planned |
| 6 | HR → HR Manager → CEO → system updated → history; for new department/position, position deletion, reporting line, salary grade, restructure | 2, 6, 11 | 3, 6 | Designed + planned |
| 7 | Access: CEO full, HR Manager edit, Dept Manager own department, Finance cost centre and grade, Employee basic chart | 3, 13 | 4 | Planned |
| 8 | 9 reports | 19 | 7 | Designed + planned |
| 9 | Auto department/position codes, update employee reporting lines, notify affected managers, history, alerts for no supervisor / no manager | 11, 13, 14 | 2, 6, 12 | Designed + planned (reporting-line update added to Task 6) |
| 10 | Links to every HR module; no employee without company, division, department, position and supervisor | 16, 17 | 10, 11 | Designed + planned |
| 11 | Sample division structure | 2 | 5 (optional sample seed) | Planned |
| 12 | 9 dashboard widgets | 11 | 7 | Designed + planned |
| 13 | Scale: 10 trading businesses, 50 divisions, 100 departments, 1,000 positions, 5,000 employees | 13 | Global constraints | Planned |

## Module 2: Employee Master Database

| § | Requirement | Window | Task | Status |
|---|---|---|---|---|
| 1 | Central record; no one active without it | 4, 17 | 9–11 | Designed + planned |
| 2 | 11 employee types; rules per type for attendance, pay, benefits, leave, documents | 17 | 9, 10 (type rules table added) | Designed + planned |
| 3.1–3.3 | Basic, contact and employment fields; 12 employment statuses | 5, 10, 17 | 9 | Designed + planned |
| 3.4 | Payroll fields, visible only to HR and Finance | 5 | 4, 9 | Designed + planned |
| 3.5 | 21 document types with type, upload date, expiry, verification status, verified by, notes | 5, 10 | 9, 11 | Designed + planned |
| 4 | Automatic, permanent `SSPC-EMP-0001` | 16, 17 | 10 | Designed + planned |
| 5 | Lifecycle from Candidate to Inactive Archive | 4, 16 | 10 | Designed + planned |
| 6 | History of position, salary, department, supervisor, type, contracts, promotions, warnings, training, reviews, leave, attendance; nothing deleted | 5 | 3, 11 (leave and attendance history added) | Designed + planned |
| 7 | 14 search filters | 4 | 11 | Designed + planned |
| 8 | 14 system actions (create … export, deactivate, archive) | 4, 5 | 11 | Designed + planned |
| 9 | HR Manager / CEO / Finance approval lists | 6 | 3, 11 | Designed + planned |
| 10 | Role access and sensitive-field masking (7 roles) | 5, 18 | 4 | Designed + planned |
| 11 | 12 automations: ID, onboarding checklist, probation and expiry reminders, notify manager/Finance/IT, missing-document alerts, counts | 16, 17 | 11, 12 (onboarding table added) | Designed + planned |
| 12 | Self-service: profile, address, emergency contact, documents, leave, attendance, roster, training, policies, requests, letters | 10 | 14 | **Leave and attendance built**; rest designed + planned; training waits for its module |
| 13 | Manager view: team, status, attendance, leave balance, training, review date, probation, contract, approvals; no salary | 18 | 11, 13 | Designed + planned |
| 14 | 14 reports | 19 | 15 | Designed + planned |
| 15 | 13 dashboard widgets | 1 | 15 | Designed + planned |
| 16 | Integrations incl. attendance and leave | 1, 18 | 9 (link to the built attendance/leave) | Planned |
| 18 | Nobody in attendance, payroll, leave, training or performance without a master record | — | 9 | Planned (the built HR staff list switches to employee records) |

## Module 3: Recruitment & ATS

| § | Requirement | Window | Task | Status |
|---|---|---|---|---|
| 2 | Workflow from workforce planning to the employee database, every stage on a dashboard | 7, 12 | 18–22 | Designed + planned |
| 3 | Workforce request (10 fields) | 15 | 18 | Designed + planned |
| 4 | Vacancy (10 fields) and priority Critical / High / Normal / Future | 15 | 16, 18 | Designed + planned |
| 5 | Dept Manager → HR Manager → Finance → CEO → published, with date, time, approver and comments | 6, 15 | 3, 18 | Designed + planned |
| 6 | Job description library (14 fields), clone and edit | 14 | 18 | Designed + planned |
| 7 | One-click publishing to 7 channels | 15 | 18 | Designed + planned (LinkedIn, Facebook, Bdjobs need API access) |
| 8 | Online application form: personal, education, employment, 7 documents | 9 | 19 | Designed + planned |
| 9 | Candidate profile; unsuccessful candidates stay searchable | 8, 20 | 16, 20 | Designed + planned |
| 10 | 14 statuses, each change records user, date and time | 7, 8 | 17, 20 | Designed + planned |
| 11 | Weighted screening score (15/30/20/15/10/10) | 8 | 17 | Designed + planned |
| 12 | 5 interview types, details, reminders to panel and candidate | 7, 8 | 20 | Designed + planned |
| 13 | 9 competencies, 4 recommendations | 8 | 20 | Designed + planned |
| 14 | 7 checks; no progress until mandatory checks are done | 8, 16 | 17, 20 | Designed + planned |
| 15 | Offer from an approved template, accepted electronically | 8, 21 | 20 | Designed + planned |
| 16 | Talent pool with 6 filters | 20 | 21 | Designed + planned |
| 17 | 9 automations | 7, 16 | 19, 20 | Designed + planned |
| 18 | 10 reports | 19 | 22 | Designed + planned |
| 19 | 11 dashboard figures | 12 | 22 | Designed + planned |
| 20 | 8 AI features, all reviewed by HR | 8 | 23 | Designed + planned (needs an AI provider decision) |
| 21 | Transfer only after offer accepted, checks done, approvals, HR confirmation | 16 | 17, 20 | Designed + planned |

## Gaps found in this check and how they were closed

The first design pass had 10 windows. These gaps were found and fixed:

- **Missing designs, now added as windows 11–21:**
  - company profile and divisions (M1 §4.1–4.2)
  - position and job description library (M1 §4.4, M3 §6)
  - workforce and vacancy request with one-click publishing (M3 §3–5, §7)
  - onboarding gate and checklist (M2 §11, M3 §21)
  - new-employee form with the five required links (M1 §10)
  - manager view (M2 §13)
  - all 33 reports (M1 §8, M2 §14, M3 §18)
  - talent pool (M3 §16)
  - offer acceptance (M3 §15)
  - the organisation and recruitment dashboard tabs (M1 §12, M3 §19)
- **People dashboard:** missing gender ratio and average tenure (M2 §15). Both added, along with today's attendance.
- **Careers form:** missing *current position*, *notice period* and *professional licences* (M3 §8). All three added.
- **Pipeline:** the board showed 7 stages but not the 14 statuses (M3 §10). Each column now lists its statuses, and the closed outcomes are counted.
- **My profile:** said leave and attendance were "Coming soon". They are built now, so the page links to them, and roster and letters were added.
- **Plan:**
  - Migrations are renumbered from 0164, because 0163 was used for attendance, leave and biometric.
  - Task 6 now updates the reporting lines of affected employees.
  - Task 9 adds per-type rules and the onboarding checklist, and makes the master record the gate for attendance and leave.
  - Task 11 adds leave and attendance to history and to the manager view.
  - Task 14 uses the built leave and attendance pages.
  - Task 23 now names shortlist recommendations and the predicted suitability score.
