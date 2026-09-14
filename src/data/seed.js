// ---------------------------------------------------------------------------
// ALL mock data for the prototype lives in this one file, so it can be edited
// live during the pitch without hunting through the codebase.
//
// Nothing here is fetched. `seed()` returns a fresh deep copy of the world on
// every call, which is what the "Reset demo data" button uses.
// ---------------------------------------------------------------------------

import { h, c, p, tbl, applyEdits, replaceHtml, insertAfter, removeBlock, moveAfter, setLevel } from '../lib/doc.js'

// ------------------------------------------------------------------ reference

export const COURSES = [
  { id: 'crs_fsd', name: 'Full Stack Development', code: 'FSD' },
  { id: 'crs_da', name: 'Data Analytics', code: 'DA' },
  { id: 'crs_dm', name: 'Digital Marketing', code: 'DM' },
  { id: 'crs_bfsi', name: 'Banking, Financial Services & Insurance', code: 'BFSI' },
  { id: 'crs_se', name: 'Spoken English Pro', code: 'SEP' },
]

export const PLANS = [
  { id: 'pln_std', name: 'Standard', note: 'Self-paid, upfront or two instalments' },
  { id: 'pln_nsdc', name: 'NSDC Certified', note: 'Skill India aligned, SSC assessed' },
  { id: 'pln_pap', name: 'Pay After Placement', note: 'Deferred fee, income share on placement' },
]

export const USERS = [
  { id: 'u_priya', name: 'Priya Menon', title: 'Senior Legal Counsel', role: 'legal_owner', initials: 'PM' },
  { id: 'u_rahul', name: 'Rahul Iyer', title: 'Legal Operations Manager', role: 'legal_owner', initials: 'RI' },
  { id: 'u_arjun', name: 'Arjun Rao', title: 'Product Manager, Growth', role: 'viewer', initials: 'AR' },
  { id: 'u_neha', name: 'Neha Gupta', title: 'Operations Lead, Learner Success', role: 'viewer', initials: 'NG' },
  { id: 'u_sana', name: 'Sana Qureshi', title: 'Compliance Analyst', role: 'viewer', initials: 'SQ' },
]

export const ROLE_LABEL = { legal_owner: 'Legal owner', viewer: 'Read-only (Product / Ops)' }

// ------------------------------------------------------- document factories
//
// The product thesis is that agreement content varies by course x plan and that
// nobody should hand-author a document per combination. The seed file practises
// what it preaches: one base document factory, specialised per plan. Duplicating
// an existing agreement in the UI does exactly what `nsdcDoc` does here.

/** The standard self-paid agreement. Every plan builds on this. */
function standardDoc(k, o) {
  return [
    h(`${k}-hA`, 'PART A — ENROLLMENT AND PROGRAMME DELIVERY'),
    c(`${k}-a1`, 1, `The Learner is enrolled in the <b>${o.course} Programme</b> ("Programme") offered by Entri Software Private Limited ("Entri"), a company incorporated under the Companies Act, 2013 and having its registered office at Kochi, Kerala.`),
    c(`${k}-a1-1`, 2, `The Programme is delivered over ${o.weeks} weeks through live online sessions, recorded lectures, mentor-led reviews and ${o.capstone}.`),
    c(`${k}-a1-2`, 2, 'Entri may revise the batch schedule, session timings or the allocated mentor by giving the Learner not less than seven (7) days prior notice through the Entri application or at the registered email address.'),
    c(`${k}-a1-3`, 2, 'The Learner may request a one-time transfer to a later batch at no additional cost, provided the request is made before completion of Week 6 of the current batch.'),

    h(`${k}-hB`, 'PART B — FEES AND PAYMENT'),
    c(`${k}-b1`, 1, `The total Programme fee is <b>₹${o.fee}</b> (${o.feeWords}), inclusive of Goods and Services Tax at the applicable rate.`),
    tbl(`${k}-b-tbl`, [
      ['Component', 'Amount (₹)', 'Due'],
      ['Registration fee', o.reg, 'On enrollment'],
      ['Instalment 1', o.inst, 'Before Week 1'],
      ['Instalment 2', o.inst, `Before Week ${Math.ceil(o.weeks / 2) + 1}`],
    ]),
    c(`${k}-b1-1`, 2, 'Where the Learner opts for equated monthly instalments through a partner Non-Banking Financial Company (NBFC), the loan is a separate contract between the Learner and the NBFC. Entri is not a party to that contract.'),
    c(`${k}-b1-2`, 2, 'The registration fee is adjusted against the total Programme fee and is not a separate charge.'),

    h(`${k}-hC`, 'PART C — REFUND AND CANCELLATION'),
    c(`${k}-c1`, 1, 'The Learner may cancel enrollment by submitting a written request to <a href="mailto:support@entri.app">support@entri.app</a> from the email address registered at enrollment.'),
    c(`${k}-c1-1`, 2, 'A cancellation request received within <b>seven (7) days</b> of batch commencement, where the Learner has attended not more than three (3) live sessions, shall be eligible for a refund of fees paid less a processing charge of <b>₹2,500</b>.'),
    c(`${k}-c1-2`, 2, 'No refund shall be payable after the seven (7) day period specified in clause 3.1, save where Entri discontinues the Programme, in which case the fee for the undelivered portion shall be refunded in full.'),
    c(`${k}-c1-3`, 2, 'Approved refunds are credited to the original payment instrument within twenty-one (21) working days of approval.'),

    h(`${k}-hD`, 'PART D — LEARNER OBLIGATIONS'),
    c(`${k}-d1`, 1, 'The Learner shall observe the standards of participation and conduct set out in this Part.'),
    c(`${k}-d1-1`, 2, 'The Learner shall attend not less than <b>sixty per cent (60%)</b> of scheduled live sessions.'),
    c(`${k}-d1-2`, 2, 'The Learner shall submit all graded assessments and the final project by the notified deadlines. Deadline extensions are at the discretion of the programme team.'),
    c(`${k}-d1-3`, 2, 'Programme content, including recordings, assignments, question banks and assessment material, is the intellectual property of Entri and shall not be reproduced, resold, shared or distributed in any form.'),
    c(`${k}-d1-4`, 2, 'The Learner shall not engage in plagiarism, impersonation during assessments, or abusive conduct toward peers, mentors or staff. Entri may terminate enrollment without refund for a breach of this clause.'),

    h(`${k}-hE`, 'PART E — DATA, NOTICES AND GOVERNING LAW'),
    c(`${k}-e1`, 1, 'Personal data collected at enrollment is processed for programme delivery, assessment, certification and statutory compliance, and is retained for the period required by applicable law.'),
    c(`${k}-e2`, 1, 'Notices under this Agreement shall be served through the Entri application or at the email address registered by the Learner, and shall be deemed delivered on the next working day.'),
    c(`${k}-e3`, 1, 'This Agreement is governed by the laws of India. The courts at Ernakulam, Kerala shall have exclusive jurisdiction over any dispute arising out of it.'),
    p(`${k}-e-close`, 'By proceeding, the Learner confirms that they have read, understood and accepted the terms of this Agreement.'),
  ]
}

/** The NSDC variant: the standard document plus a certification part. */
function nsdcDoc(k, o) {
  return applyEdits(standardDoc(k, o), [
    insertAfter(
      `${k}-e-close`,
      h(`${k}-hF`, 'PART F — NSDC CERTIFICATION CONDITIONS'),
      c(`${k}-f1`, 1, `The Programme is aligned to Qualification Pack <b>${o.qp}</b> notified by the ${o.ssc} under the National Skill Development Corporation ("NSDC").`),
      c(`${k}-f1-1`, 2, 'Certification is issued by NSDC jointly with the relevant Sector Skill Council and not by Entri. Entri is an empanelled training partner and does not guarantee the issue of a certificate.'),
      c(`${k}-f1-2`, 2, 'The Learner shall complete candidate registration on the Skill India Digital Hub, including Aadhaar-based verification, within <b>fourteen (14) days</b> of enrollment. Certification cannot be processed without a valid registration number.'),
      c(`${k}-f1-3`, 2, 'The Learner shall maintain not less than <b>eighty per cent (80%)</b> attendance in scheduled sessions, as mandated by NSDC training guidelines. This requirement overrides the attendance standard in Part D.'),
      c(`${k}-f1-4`, 2, 'Final assessment shall be conducted by an assessment agency empanelled by the Sector Skill Council. The Learner shall secure the minimum aggregate score prescribed for the Qualification Pack in order to be declared successful.'),
      c(`${k}-f1-5`, 2, 'A Learner declared unsuccessful may avail one (1) re-assessment attempt within six (6) months of the original assessment, subject to the re-assessment fee notified by the Sector Skill Council.'),
      c(`${k}-f1-6`, 2, 'Where the Programme is delivered under a government-sponsored scheme, fee and refund treatment is governed by the applicable scheme guidelines and clause 3.1 shall not apply.'),
    ),
    // The closing acceptance line belongs at the end of the document.
    moveAfter(`${k}-e-close`, `${k}-f1-6`),
  ])
}

/** The Pay After Placement variant. */
function papDoc(k, o) {
  return applyEdits(standardDoc(k, o), [
    replaceHtml(`${k}-b1`, `The Programme fee is deferred. No tuition is payable by the Learner prior to placement, save the registration fee of <b>₹${o.reg}</b> payable on enrollment.`),
    insertAfter(
      `${k}-e-close`,
      h(`${k}-hF`, 'PART F — DEFERRED FEE AND INCOME SHARE'),
      c(`${k}-f1`, 1, `On securing employment with a gross annual cost to company of <b>₹${o.threshold}</b> or above, the Learner shall pay <b>${o.share}%</b> of monthly gross salary for <b>${o.months} months</b>, subject to an aggregate cap of <b>₹${o.cap}</b>.`),
      c(`${k}-f1-1`, 2, `No income share is payable for any month in which the Learner's gross annual cost to company falls below ₹${o.threshold}, and the obligation stands suspended for that period.`),
      c(`${k}-f1-2`, 2, 'The income share obligation expires thirty-six (36) months after the Learner completes the Programme, whether or not the aggregate cap has been reached.'),
      c(`${k}-f1-3`, 2, 'The Learner shall disclose offer letters and salary revisions within fifteen (15) days of receipt. Entri may seek reasonable verification of employment and remuneration.'),
      c(`${k}-f1-4`, 2, 'Entri does not guarantee placement. Placement assistance comprises interview preparation, portfolio review and referrals to hiring partners.'),
    ),
    moveAfter(`${k}-e-close`, `${k}-f1-4`),
  ])
}

const anx = (id, title, blocks) => ({ id, title, blocks })

// ------------------------------------------------- flagship: FSD × Standard
//
// This is the agreement the demo walks through. Three published versions, with
// v2 and v3 built by applying named edits to the version before them, so the
// diff view renders genuine, traceable differences.

const FSD_STD_V1 = standardDoc('fsd', {
  course: 'Full Stack Development',
  weeks: 24,
  capstone: 'one capstone project submission',
  fee: '54,000',
  feeWords: 'Rupees Fifty Four Thousand only',
  reg: '5,000',
  inst: '24,500',
})

const FSD_STD_V1_ANX = [
  anx('fsd-anx-a', 'Annexure A — Fee Schedule and Payment Milestones', [
    p('fsd-anx-a-p1', 'This Annexure sets out the payment milestones referred to in Part B and forms an integral part of the Agreement.'),
    tbl('fsd-anx-a-t1', [
      ['Milestone', 'Trigger', 'Amount (₹)', 'Mode'],
      ['M1 — Registration', 'Seat confirmation', '5,000', 'UPI / Card / Net banking'],
      ['M2 — Instalment 1', 'Week 1 commencement', '24,500', 'UPI / Card / NBFC EMI'],
      ['M3 — Instalment 2', 'Week 13 commencement', '24,500', 'UPI / Card / NBFC EMI'],
    ]),
    p('fsd-anx-a-p2', 'A delay of more than fifteen (15) days in any milestone may result in suspension of access to live sessions until the outstanding amount is cleared.'),
  ]),
  anx('fsd-anx-b', 'Annexure B — Assessment Rubric and Grading Bands', [
    p('fsd-anx-b-p1', 'Graded components and their weightage in the final score are as follows.'),
    tbl('fsd-anx-b-t1', [
      ['Component', 'Weightage', 'Minimum to pass'],
      ['Weekly coding assignments', '30%', '50%'],
      ['Mid-programme assessment', '20%', '50%'],
      ['Capstone project', '40%', '60%'],
      ['Attendance and participation', '10%', '—'],
    ]),
    p('fsd-anx-b-p2', 'Grading bands: Distinction 85% and above; First Class 70%–84%; Pass 60%–69%; Not Cleared below 60%.'),
  ]),
]

// v2 — refund liberalisation, requested by Learner Success after cancellation
// complaints, plus the placement-eligibility bar Product asked for.
const FSD_STD_V2_EDITS = [
  replaceHtml('fsd-c1-1', 'A cancellation request received within <b>fourteen (14) days</b> of batch commencement, where the Learner has attended not more than four (4) live sessions, shall be eligible for a refund of fees paid less a processing charge of <b>₹1,500</b>.'),
  replaceHtml('fsd-c1-2', 'No refund shall be payable after the fourteen (14) day period specified in clause 3.1, save where Entri discontinues the Programme, in which case the fee for the undelivered portion shall be refunded in full.'),
  insertAfter('fsd-c1-3', c('fsd-c1-4', 2, 'Where fees have been disbursed by a partner NBFC, Entri shall notify the NBFC of an approved cancellation within seven (7) working days so that the loan may be foreclosed. Interest accrued up to the date of foreclosure remains payable by the Learner to the NBFC.')),
  replaceHtml('fsd-a1-3', 'The Learner may request a one-time transfer to a later batch at no additional cost, provided the request is made before completion of Week 8 of the current batch. A second transfer request attracts a fee of ₹2,000.'),
  insertAfter('fsd-d1-4', c('fsd-d1-5', 2, 'Eligibility for placement assistance requires attendance of not less than eighty per cent (80%) of scheduled live sessions and submission of the capstone project within the notified deadline.')),
]

// v3 — the compliance release. DPDP Act 2023 wording, a higher assessment bar,
// an AI-tools clause, and the batch-transfer clause moved out of Part A into
// Part C where cancellation and transfer now sit together.
const FSD_STD_V3_EDITS = [
  replaceHtml('fsd-d1-1', 'The Learner shall attend not less than <b>seventy per cent (70%)</b> of scheduled live sessions. Attendance is computed on live session join duration and not on recording views.'),
  insertAfter('fsd-d1-5', c('fsd-d1-6', 2, 'The Learner may use generative AI tools for learning and exploration, but shall not submit AI-generated work as their own in any graded assessment or in the capstone project. Submissions are screened, and a confirmed breach is treated as plagiarism under clause 4.4.')),
  replaceHtml('fsd-e1', 'Personal data collected at enrollment is processed under the <b>Digital Personal Data Protection Act, 2023</b> for the purposes of programme delivery, assessment, certification, placement assistance and statutory compliance. Processing is on the basis of the consent recorded at enrollment.'),
  insertAfter('fsd-e1', c('fsd-e1-1', 2, 'The Learner may withdraw consent at any time by written notice to <a href="mailto:privacy@entri.app">privacy@entri.app</a>. Withdrawal of consent will end programme delivery and certification, and is treated as cancellation under Part C.')),
  insertAfter('fsd-e1-1', c('fsd-e1-2', 2, 'Grievances relating to personal data may be addressed to the Data Protection Officer, Entri Software Private Limited, Kochi, Kerala, who shall respond within thirty (30) days of receipt.')),
  // Structural change: batch transfer belongs with cancellation.
  moveAfter('fsd-a1-3', 'fsd-c1-4'),
  setLevel('fsd-a1-3', 2),
]

const FSD_STD_V3_ANX = [
  ...FSD_STD_V1_ANX,
  anx('fsd-anx-c', 'Annexure C — Data Processing and Consent Notice', [
    p('fsd-anx-c-p1', 'This Annexure is issued under the Digital Personal Data Protection Act, 2023 and describes the personal data Entri processes, why it is processed, and for how long it is retained.'),
    tbl('fsd-anx-c-t1', [
      ['Category of data', 'Purpose', 'Retention'],
      ['Name, mobile, email', 'Enrollment, notices, support', '3 years after programme completion'],
      ['Government ID (where required)', 'Certification and statutory reporting', 'As mandated by the issuing authority'],
      ['Assessment scores and submissions', 'Grading, certification, dispute resolution', '5 years'],
      ['Session attendance logs', 'Eligibility for certification and placement assistance', '3 years'],
      ['Payment and loan references', 'Fee reconciliation and refunds', '8 years (statutory)'],
    ]),
    p('fsd-anx-c-p2', 'Entri does not sell personal data. Data is shared with partner NBFCs, assessment agencies and hiring partners only to the extent necessary for the purposes stated above.'),
  ]),
]

const FSD_STD_V2 = applyEdits(FSD_STD_V1, FSD_STD_V2_EDITS)
const FSD_STD_V3 = applyEdits(FSD_STD_V2, FSD_STD_V3_EDITS)

// -------------------------------------------------- the other course × plan docs

const FSD_NSDC_V1 = nsdcDoc('fsdn', {
  course: 'Full Stack Development (NSDC Certified)',
  weeks: 26, capstone: 'one capstone project and an SSC-conducted practical assessment',
  fee: '48,000', feeWords: 'Rupees Forty Eight Thousand only', reg: '4,000', inst: '22,000',
  qp: 'SSC/Q0508 — Full Stack Developer, Level 5', ssc: 'IT-ITeS Sector Skill Council NASSCOM',
})
const FSD_NSDC_V2 = applyEdits(FSD_NSDC_V1, [
  replaceHtml('fsdn-f1-2', 'The Learner shall complete candidate registration on the Skill India Digital Hub, including Aadhaar-based verification, within <b>thirty (30) days</b> of enrollment. Certification cannot be processed without a valid registration number.'),
  insertAfter('fsdn-f1-6', c('fsdn-f1-7', 2, 'Where a Learner is unable to complete Skill India Digital Hub registration on account of an Aadhaar authentication failure, Entri shall assist with the alternate verification route notified by the Sector Skill Council, and the certification timeline shall stand extended accordingly.')),
])

const DA_STD_V1 = standardDoc('da', {
  course: 'Data Analytics', weeks: 20, capstone: 'two portfolio case studies',
  fee: '42,000', feeWords: 'Rupees Forty Two Thousand only', reg: '4,000', inst: '19,000',
})
const DA_STD_V2 = applyEdits(DA_STD_V1, [
  replaceHtml('da-d1-2', 'The Learner shall submit all graded assessments and both portfolio case studies by the notified deadlines. One deadline extension of up to seven (7) days may be availed per case study on written request.'),
  insertAfter('da-b1-2', c('da-b1-3', 2, 'Tool licences required for the Programme, including cloud warehouse credits, are provided by Entri for the duration of the Programme and are withdrawn on completion or cancellation.')),
])

const DA_NSDC_V1 = nsdcDoc('dan', {
  course: 'Data Analytics (NSDC Certified)', weeks: 22, capstone: 'two portfolio case studies and an SSC-conducted assessment',
  fee: '38,000', feeWords: 'Rupees Thirty Eight Thousand only', reg: '3,500', inst: '17,250',
  qp: 'SSC/Q2101 — Data Associate, Level 4', ssc: 'IT-ITeS Sector Skill Council NASSCOM',
})
// An unpublished draft sitting with a second legal owner for approval.
const DA_NSDC_DRAFT = applyEdits(DA_NSDC_V1, [
  replaceHtml('dan-f1-3', 'The Learner shall maintain not less than <b>seventy-five per cent (75%)</b> attendance in scheduled sessions, in line with the revised NSDC training guidelines notified in August 2026. This requirement overrides the attendance standard in Part D.'),
  insertAfter('dan-f1-5', c('dan-f1-8', 2, 'A Learner who completes the Programme but does not appear for the SSC assessment within six (6) months shall be marked as "Training Completed, Not Assessed" on the Skill India Digital Hub, and may re-register for assessment at the fee then notified.')),
])

const BFSI_NSDC_V1 = nsdcDoc('bfsi', {
  course: 'Banking, Financial Services & Insurance', weeks: 16, capstone: 'a branch operations simulation and an SSC-conducted assessment',
  fee: '29,000', feeWords: 'Rupees Twenty Nine Thousand only', reg: '3,000', inst: '13,000',
  qp: 'BSC/Q0101 — Customer Service Executive (Banking), Level 4', ssc: 'BFSI Sector Skill Council of India',
})

const FSD_PAP_V1 = papDoc('fsdp', {
  course: 'Full Stack Development (Pay After Placement)', weeks: 28, capstone: 'two capstone projects and a mock interview series',
  fee: '0', feeWords: 'deferred', reg: '7,500', inst: '0',
  threshold: '4,00,000', share: '12', months: '18', cap: '1,20,000',
})

const SEP_STD_V1 = standardDoc('sep', {
  course: 'Spoken English Pro', weeks: 12, capstone: 'a recorded fluency assessment',
  fee: '12,000', feeWords: 'Rupees Twelve Thousand only', reg: '1,500', inst: '5,250',
})

// Digital Marketing × Standard has never been published — it is the Draft in the
// library, and the empty-state story for a brand new course × plan combination.
const DM_STD_DRAFT = standardDoc('dm', {
  course: 'Digital Marketing', weeks: 14, capstone: 'a live campaign build and a portfolio review',
  fee: '24,000', feeWords: 'Rupees Twenty Four Thousand only', reg: '2,500', inst: '10,750',
})

const shortAnx = (k, title, intro, rows) => [
  anx(`${k}-anx-a`, title, [p(`${k}-anx-a-p1`, intro), tbl(`${k}-anx-a-t1`, rows)]),
]

// ------------------------------------------------------------------ agreements

const version = (n, o) => ({
  version: n,
  publishedAt: o.at,
  publishedBy: o.by,
  effectiveFrom: o.effectiveFrom || o.at,
  changeSummary: o.summary,
  retroactive: !!o.retroactive,
  reconsent: o.reconsent || null,
  blocks: o.blocks,
  annexures: o.annexures || [],
})

const AGREEMENTS = [
  {
    id: 'ag_fsd_std',
    name: 'Full Stack Development — Standard Terms',
    courseId: 'crs_fsd',
    planId: 'pln_std',
    createdAt: '2026-02-04T09:12:00+05:30',
    createdBy: 'u_priya',
    cohort: { activeLearners: 2431, enrolledLast30: 386 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-02-10T15:40:00+05:30', by: 'u_priya',
        summary: 'Initial migration of the learner agreement out of the shared Google Doc and into Streamline. Content matches the document in force since January 2026, with no wording changes.',
        blocks: FSD_STD_V1, annexures: FSD_STD_V1_ANX,
      }),
      version(2, {
        at: '2026-05-18T12:05:00+05:30', by: 'u_priya', effectiveFrom: '2026-06-01T00:00:00+05:30',
        summary: 'Refund window widened from 7 to 14 days and the processing charge reduced from ₹2,500 to ₹1,500, following Learner Success escalations on early cancellations. NBFC loan foreclosure obligation added. Batch transfer deadline extended to Week 8. Placement assistance eligibility bar introduced at 80% attendance.',
        blocks: FSD_STD_V2, annexures: FSD_STD_V1_ANX,
      }),
      version(3, {
        at: '2026-08-02T18:22:00+05:30', by: 'u_rahul', effectiveFrom: '2026-08-02T18:22:00+05:30',
        retroactive: true,
        reconsent: { prompted: 2431, reAccepted: 1204, pending: 1227 },
        summary: 'Compliance release. DPDP Act 2023 consent, consent-withdrawal and grievance officer clauses added to Part E. Attendance obligation raised from 60% to 70%. Generative AI usage clause added to Part D. Batch transfer relocated from Part A to Part C so cancellation and transfer sit together. New Annexure C — Data Processing and Consent Notice.',
        blocks: FSD_STD_V3, annexures: FSD_STD_V3_ANX,
      }),
    ],
  },
  {
    id: 'ag_fsd_nsdc',
    name: 'Full Stack Development — NSDC Certified',
    courseId: 'crs_fsd', planId: 'pln_nsdc',
    createdAt: '2026-02-26T11:00:00+05:30', createdBy: 'u_priya',
    cohort: { activeLearners: 1187, enrolledLast30: 204 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-03-06T16:30:00+05:30', by: 'u_priya',
        summary: 'Created by duplicating Full Stack Development — Standard Terms v1 and adding Part F covering NSDC certification, Skill India Digital Hub registration, the 80% attendance mandate and SSC assessment conditions.',
        blocks: FSD_NSDC_V1,
        annexures: shortAnx('fsdn', 'Annexure A — Qualification Pack Mapping', 'Mapping of Programme modules to the National Occupational Standards under SSC/Q0508.', [
          ['NOS code', 'National Occupational Standard', 'Programme module'],
          ['SSC/N0501', 'Develop software using a programming language', 'Modules 1–4'],
          ['SSC/N0503', 'Design and build front-end interfaces', 'Modules 5–8'],
          ['SSC/N0506', 'Implement and consume APIs', 'Modules 9–12'],
          ['SSC/N9001', 'Manage work to meet requirements', 'Capstone'],
        ]),
      }),
      version(2, {
        at: '2026-07-14T10:15:00+05:30', by: 'u_rahul',
        summary: 'Skill India Digital Hub registration window extended from 14 to 30 days after operations reported Aadhaar authentication failures blocking certification. Alternate verification route added at clause 6.7.',
        blocks: FSD_NSDC_V2,
        annexures: shortAnx('fsdn', 'Annexure A — Qualification Pack Mapping', 'Mapping of Programme modules to the National Occupational Standards under SSC/Q0508.', [
          ['NOS code', 'National Occupational Standard', 'Programme module'],
          ['SSC/N0501', 'Develop software using a programming language', 'Modules 1–4'],
          ['SSC/N0503', 'Design and build front-end interfaces', 'Modules 5–8'],
          ['SSC/N0506', 'Implement and consume APIs', 'Modules 9–12'],
          ['SSC/N9001', 'Manage work to meet requirements', 'Capstone'],
        ]),
      }),
    ],
  },
  {
    id: 'ag_fsd_pap',
    name: 'Full Stack Development — Pay After Placement',
    courseId: 'crs_fsd', planId: 'pln_pap',
    createdAt: '2026-06-09T14:20:00+05:30', createdBy: 'u_rahul',
    cohort: { activeLearners: 612, enrolledLast30: 143 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-06-22T17:45:00+05:30', by: 'u_rahul',
        summary: 'Created by duplicating Full Stack Development — Standard Terms v2. Tuition deferred to placement; Part F added covering the 12% income share, ₹4,00,000 CTC threshold, 18-month payment term and ₹1,20,000 aggregate cap.',
        blocks: FSD_PAP_V1,
        annexures: shortAnx('fsdp', 'Annexure A — Income Share Illustration', 'Illustrative income share outcomes. Figures are indicative and do not form a representation of expected salary.', [
          ['Gross CTC (₹ p.a.)', 'Monthly share (₹)', 'Months payable', 'Total payable (₹)'],
          ['Below 4,00,000', 'Nil', '—', 'Nil'],
          ['4,50,000', '4,500', '18', '81,000'],
          ['6,00,000', '6,000', '18', '1,08,000'],
          ['9,00,000', '9,000', '14 (cap reached)', '1,20,000'],
        ]),
      }),
    ],
  },
  {
    id: 'ag_da_std',
    name: 'Data Analytics — Standard Terms',
    courseId: 'crs_da', planId: 'pln_std',
    createdAt: '2026-03-11T10:05:00+05:30', createdBy: 'u_priya',
    cohort: { activeLearners: 1946, enrolledLast30: 271 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-03-19T13:00:00+05:30', by: 'u_priya',
        summary: 'Created by duplicating Full Stack Development — Standard Terms v1, with course name, duration and fee schedule adjusted for Data Analytics.',
        blocks: DA_STD_V1, annexures: [],
      }),
      version(2, {
        at: '2026-09-05T11:30:00+05:30', by: 'u_priya',
        summary: 'Per-case-study deadline extension of up to seven days introduced at clause 4.2. Tool licence and cloud credit provision clarified at clause 2.3 after a query from the analytics faculty.',
        blocks: DA_STD_V2, annexures: [],
      }),
    ],
  },
  {
    id: 'ag_da_nsdc',
    name: 'Data Analytics — NSDC Certified',
    courseId: 'crs_da', planId: 'pln_nsdc',
    createdAt: '2026-04-02T09:40:00+05:30', createdBy: 'u_rahul',
    cohort: { activeLearners: 874, enrolledLast30: 118 },
    versions: [
      version(1, {
        at: '2026-04-15T15:10:00+05:30', by: 'u_rahul',
        summary: 'Created by duplicating Data Analytics — Standard Terms v1 and adding Part F for NSDC certification under SSC/Q2101.',
        blocks: DA_NSDC_V1, annexures: [],
      }),
    ],
    // Submitted for a second legal owner to approve -- this is what puts the
    // agreement into "Pending approval" in the library.
    draft: {
      blocks: DA_NSDC_DRAFT,
      annexures: [],
      baseVersion: 1,
      savedAt: '2026-09-11T17:05:00+05:30',
      savedBy: 'u_rahul',
      submittedForApproval: { by: 'u_rahul', at: '2026-09-11T17:12:00+05:30' },
    },
  },
  {
    id: 'ag_dm_std',
    name: 'Digital Marketing — Standard Terms',
    courseId: 'crs_dm', planId: 'pln_std',
    createdAt: '2026-09-08T16:00:00+05:30', createdBy: 'u_priya',
    cohort: { activeLearners: 0, enrolledLast30: 0 },
    versions: [],
    draft: {
      blocks: DM_STD_DRAFT,
      annexures: [],
      baseVersion: null,
      savedAt: '2026-09-12T12:40:00+05:30',
      savedBy: 'u_priya',
      submittedForApproval: null,
    },
  },
  {
    id: 'ag_bfsi_nsdc',
    name: 'BFSI — NSDC Certified',
    courseId: 'crs_bfsi', planId: 'pln_nsdc',
    createdAt: '2026-05-20T11:15:00+05:30', createdBy: 'u_priya',
    cohort: { activeLearners: 1338, enrolledLast30: 96 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-05-29T14:55:00+05:30', by: 'u_priya',
        summary: 'Created by duplicating Data Analytics — NSDC Certified v1. Qualification Pack, Sector Skill Council and fee schedule replaced for the BFSI programme.',
        blocks: BFSI_NSDC_V1, annexures: [],
      }),
    ],
  },
  {
    id: 'ag_sep_std',
    name: 'Spoken English Pro — Standard Terms',
    courseId: 'crs_se', planId: 'pln_std',
    createdAt: '2026-06-30T10:30:00+05:30', createdBy: 'u_rahul',
    cohort: { activeLearners: 3204, enrolledLast30: 517 },
    draft: null,
    versions: [
      version(1, {
        at: '2026-07-08T16:20:00+05:30', by: 'u_rahul',
        summary: 'Created by duplicating Data Analytics — Standard Terms v1 for the Spoken English Pro programme, with a 12-week duration and revised fee schedule.',
        blocks: SEP_STD_V1, annexures: [],
      }),
    ],
  },
]

// ------------------------------------------------------------- change requests

const CHANGE_REQUESTS = [
  {
    id: 'cr_401',
    agreementId: 'ag_fsd_std',
    section: 'PART C — REFUND AND CANCELLATION',
    request: 'Clause 3.1 should also cover learners who deferred to a later batch. Today a learner who transfers at Week 6 and then cancels in the new batch is told the 14-day window already expired, because it runs from the original batch start.',
    reason: 'We are getting roughly 20 escalations a month on this and Support has no policy to point at. Two have gone to consumer forum notices.',
    priority: 'High',
    requestedBy: 'u_arjun',
    createdAt: '2026-09-09T10:24:00+05:30',
    status: 'open',
    actionedBy: null, actionedAt: null, resolution: null,
  },
  {
    id: 'cr_398',
    agreementId: 'ag_da_nsdc',
    section: 'PART F — NSDC CERTIFICATION CONDITIONS',
    request: 'Raise the Skill India Digital Hub registration window from 14 days to at least 30 days, matching what was already done on the Full Stack NSDC agreement in July.',
    reason: 'Aadhaar authentication failures are blocking about 8% of the cohort and 14 days is not enough to run the alternate verification route.',
    priority: 'Medium',
    requestedBy: 'u_neha',
    createdAt: '2026-09-04T15:48:00+05:30',
    status: 'in_review',
    actionedBy: null, actionedAt: null, resolution: null,
  },
  {
    id: 'cr_386',
    agreementId: 'ag_fsd_std',
    section: 'PART E — DATA, NOTICES AND GOVERNING LAW',
    request: 'Add explicit DPDP Act 2023 consent language, a consent withdrawal route, and a named grievance officer with a response timeline.',
    reason: 'Required before the DPDP compliance audit in August. Our current Part E predates the Act and only says data is processed for programme delivery.',
    priority: 'High',
    requestedBy: 'u_sana',
    createdAt: '2026-07-21T09:15:00+05:30',
    status: 'actioned',
    actionedBy: 'u_rahul',
    actionedAt: '2026-08-02T18:22:00+05:30',
    resolution: 'Addressed in v3. Clause 5 rewritten under the DPDP Act 2023, withdrawal route added at 5.1, Data Protection Officer and 30-day response timeline at 5.2, and Annexure C added covering data categories, purposes and retention.',
  },
  {
    id: 'cr_377',
    agreementId: 'ag_sep_std',
    section: 'PART B — FEES AND PAYMENT',
    request: 'Remove the separate registration fee line from the fee table and fold it into Instalment 1.',
    reason: 'The two-line split is confusing on the checkout page and we think it is costing us conversions.',
    priority: 'Low',
    requestedBy: 'u_arjun',
    createdAt: '2026-08-14T13:02:00+05:30',
    status: 'rejected',
    actionedBy: 'u_priya',
    actionedAt: '2026-08-18T11:40:00+05:30',
    resolution: 'Not actioned. The registration fee is separately refundable under Part C and is reported separately for GST. Folding it into an instalment would change the refund treatment. Raised with Growth to solve this in checkout copy instead.',
  },
]

// ----------------------------------------------------------------- audit log

const AUDIT = [
  { id: 'au_01', at: '2026-02-04T09:12:00+05:30', userId: 'u_priya', type: 'agreement_created', agreementId: 'ag_fsd_std', summary: 'Created agreement “Full Stack Development — Standard Terms”' },
  { id: 'au_02', at: '2026-02-10T15:40:00+05:30', userId: 'u_priya', type: 'version_published', agreementId: 'ag_fsd_std', version: 1, summary: 'Published v1 — initial migration from the shared Google Doc' },
  { id: 'au_03', at: '2026-03-06T16:30:00+05:30', userId: 'u_priya', type: 'version_published', agreementId: 'ag_fsd_nsdc', version: 1, summary: 'Published v1 — duplicated from Full Stack Development — Standard Terms v1' },
  { id: 'au_04', at: '2026-05-18T12:05:00+05:30', userId: 'u_priya', type: 'version_published', agreementId: 'ag_fsd_std', version: 2, summary: 'Published v2 — refund window widened to 14 days, processing charge reduced to ₹1,500' },
  { id: 'au_05', at: '2026-06-22T17:45:00+05:30', userId: 'u_rahul', type: 'version_published', agreementId: 'ag_fsd_pap', version: 1, summary: 'Published v1 — Pay After Placement terms, duplicated from Standard v2' },
  { id: 'au_06', at: '2026-07-08T16:20:00+05:30', userId: 'u_rahul', type: 'version_published', agreementId: 'ag_sep_std', version: 1, summary: 'Published v1 — Spoken English Pro standard terms' },
  { id: 'au_07', at: '2026-07-14T10:15:00+05:30', userId: 'u_rahul', type: 'version_published', agreementId: 'ag_fsd_nsdc', version: 2, summary: 'Published v2 — Skill India registration window extended to 30 days' },
  { id: 'au_08', at: '2026-07-21T09:15:00+05:30', userId: 'u_sana', type: 'change_request_raised', agreementId: 'ag_fsd_std', requestId: 'cr_386', summary: 'Raised change request CR-386 — DPDP Act 2023 consent and grievance officer clauses' },
  { id: 'au_09', at: '2026-07-24T11:20:00+05:30', userId: 'u_rahul', type: 'draft_saved', agreementId: 'ag_fsd_std', summary: 'Saved draft based on v2 — first pass at the DPDP Act rewrite of Part E' },
  { id: 'au_10', at: '2026-07-29T18:05:00+05:30', userId: 'u_rahul', type: 'draft_saved', agreementId: 'ag_fsd_std', summary: 'Saved draft based on v2 — attendance raised to 70%, generative AI clause added' },
  { id: 'au_11', at: '2026-08-02T18:22:00+05:30', userId: 'u_rahul', type: 'version_published', agreementId: 'ag_fsd_std', version: 3, summary: 'Published v3 — DPDP Act 2023 compliance release, applied retroactively' },
  { id: 'au_12', at: '2026-08-02T18:22:00+05:30', userId: 'u_rahul', type: 'reconsent_triggered', agreementId: 'ag_fsd_std', version: 3, summary: 'Re-consent triggered for 2,431 active learners on publication of v3' },
  { id: 'au_13', at: '2026-08-02T18:24:00+05:30', userId: 'u_rahul', type: 'change_request_actioned', agreementId: 'ag_fsd_std', requestId: 'cr_386', summary: 'Actioned change request CR-386 — addressed in v3' },
  { id: 'au_14', at: '2026-08-14T13:02:00+05:30', userId: 'u_arjun', type: 'change_request_raised', agreementId: 'ag_sep_std', requestId: 'cr_377', summary: 'Raised change request CR-377 — fold registration fee into Instalment 1' },
  { id: 'au_15', at: '2026-08-18T11:40:00+05:30', userId: 'u_priya', type: 'change_request_actioned', agreementId: 'ag_sep_std', requestId: 'cr_377', summary: 'Rejected change request CR-377 — separate GST and refund treatment' },
  { id: 'au_16', at: '2026-09-04T15:48:00+05:30', userId: 'u_neha', type: 'change_request_raised', agreementId: 'ag_da_nsdc', requestId: 'cr_398', summary: 'Raised change request CR-398 — extend Skill India registration window' },
  { id: 'au_17', at: '2026-09-05T11:30:00+05:30', userId: 'u_priya', type: 'version_published', agreementId: 'ag_da_std', version: 2, summary: 'Published v2 — case study extension and tool licence clauses' },
  { id: 'au_18', at: '2026-09-08T16:00:00+05:30', userId: 'u_priya', type: 'agreement_created', agreementId: 'ag_dm_std', summary: 'Created agreement “Digital Marketing — Standard Terms”' },
  { id: 'au_19', at: '2026-09-09T10:24:00+05:30', userId: 'u_arjun', type: 'change_request_raised', agreementId: 'ag_fsd_std', requestId: 'cr_401', summary: 'Raised change request CR-401 — refund window after batch transfer' },
  { id: 'au_20', at: '2026-09-11T17:05:00+05:30', userId: 'u_rahul', type: 'draft_saved', agreementId: 'ag_da_nsdc', summary: 'Saved draft based on v1 — attendance mandate revised to 75%' },
  { id: 'au_21', at: '2026-09-11T17:12:00+05:30', userId: 'u_rahul', type: 'draft_submitted', agreementId: 'ag_da_nsdc', summary: 'Submitted draft for approval' },
  { id: 'au_22', at: '2026-09-12T12:40:00+05:30', userId: 'u_priya', type: 'draft_saved', agreementId: 'ag_dm_std', summary: 'Saved draft — first pass at Digital Marketing standard terms' },
]

// -------------------------------------------------------------- acceptances
//
// Append-only. A learner who re-consents gets a SECOND row; the original is
// never touched. That is the record that proves publishing does not rewrite
// what someone already agreed to.

const ACCEPTANCES = [
  { id: 'ac_01', learnerId: 'ENT-LRN-10871', learnerName: 'Vishnu Prasad', agreementId: 'ag_fsd_std', version: 1, acceptedAt: '2026-03-04T19:10:00+05:30', trigger: 'enrollment' },
  { id: 'ac_02', learnerId: 'ENT-LRN-10234', learnerName: 'Aparna Nair', agreementId: 'ag_fsd_std', version: 2, acceptedAt: '2026-06-12T20:35:00+05:30', trigger: 'enrollment' },
  { id: 'ac_03', learnerId: 'ENT-LRN-10234', learnerName: 'Aparna Nair', agreementId: 'ag_da_nsdc', version: 1, acceptedAt: '2026-07-20T09:05:00+05:30', trigger: 'enrollment' },
  { id: 'ac_04', learnerId: 'ENT-LRN-12233', learnerName: 'Sneha Pillai', agreementId: 'ag_bfsi_nsdc', version: 1, acceptedAt: '2026-07-02T11:22:00+05:30', trigger: 'enrollment' },
  { id: 'ac_05', learnerId: 'ENT-LRN-11402', learnerName: 'Fathima Rasheed', agreementId: 'ag_fsd_nsdc', version: 1, acceptedAt: '2026-05-30T17:48:00+05:30', trigger: 'enrollment' },
  // The re-consent row. Aparna's original v2 acceptance above is untouched.
  { id: 'ac_06', learnerId: 'ENT-LRN-10234', learnerName: 'Aparna Nair', agreementId: 'ag_fsd_std', version: 3, acceptedAt: '2026-08-03T08:14:00+05:30', trigger: 're-consent' },
  { id: 'ac_07', learnerId: 'ENT-LRN-11402', learnerName: 'Fathima Rasheed', agreementId: 'ag_fsd_nsdc', version: 2, acceptedAt: '2026-08-28T14:02:00+05:30', trigger: 're-consent' },
  { id: 'ac_08', learnerId: 'ENT-LRN-12233', learnerName: 'Sneha Pillai', agreementId: 'ag_sep_std', version: 1, acceptedAt: '2026-08-11T10:40:00+05:30', trigger: 'enrollment' },
  { id: 'ac_09', learnerId: 'ENT-LRN-11987', learnerName: 'Karthik Menon', agreementId: 'ag_fsd_std', version: 3, acceptedAt: '2026-08-19T21:05:00+05:30', trigger: 'enrollment' },
  { id: 'ac_10', learnerId: 'ENT-LRN-12890', learnerName: 'Rohit Varma', agreementId: 'ag_fsd_pap', version: 1, acceptedAt: '2026-09-01T13:18:00+05:30', trigger: 'enrollment' },
  { id: 'ac_11', learnerId: 'ENT-LRN-13001', learnerName: 'Meera Krishnan', agreementId: 'ag_da_std', version: 1, acceptedAt: '2026-04-27T16:55:00+05:30', trigger: 'enrollment' },
  { id: 'ac_12', learnerId: 'ENT-LRN-13001', learnerName: 'Meera Krishnan', agreementId: 'ag_sep_std', version: 1, acceptedAt: '2026-09-05T18:30:00+05:30', trigger: 'enrollment' },
  { id: 'ac_13', learnerId: 'ENT-LRN-12890', learnerName: 'Rohit Varma', agreementId: 'ag_da_std', version: 2, acceptedAt: '2026-09-07T12:00:00+05:30', trigger: 'enrollment' },
  { id: 'ac_14', learnerId: 'ENT-LRN-11987', learnerName: 'Karthik Menon', agreementId: 'ag_bfsi_nsdc', version: 1, acceptedAt: '2026-09-02T09:45:00+05:30', trigger: 'enrollment' },
]

// ---------------------------------------------------------------------------

/** A fresh, deeply independent copy of the whole world. */
export function seed() {
  return structuredClone({
    agreements: AGREEMENTS,
    changeRequests: CHANGE_REQUESTS,
    audit: AUDIT,
    acceptances: ACCEPTANCES,
  })
}
