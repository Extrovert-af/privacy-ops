import type { AssessmentTemplate } from "../lib/types";

export const assessmentTemplates: AssessmentTemplate[] = [
  {
    id: "tmpl-gdpr-dpia",
    name: "GDPR DPIA Template",
    regulation: "GDPR",
    version: "2.1",
    description: "Standard DPIA template aligned with Article 35 of GDPR",
    sections: [
      {
        id: "sec-system-info",
        title: "System & Data Processing Information",
        description: "Basic information about the processing activity",
        questions: [
          {
            id: "q1",
            text: "What is the purpose of the data processing activity?",
            type: "textarea",
            required: true,
            helpText: "Describe the main business objective requiring data processing",
          },
          {
            id: "q2",
            text: "What categories of personal data are being processed?",
            type: "checkbox",
            options: [
              "Basic identifiers (name, email, phone)",
              "Financial data",
              "Health/medical data",
              "Biometric data",
              "Location data",
              "Online identifiers (IP, cookies)",
              "Racial/ethnic origin",
              "Political opinions",
              "Religious beliefs",
              "Genetic data",
              "Criminal records",
            ],
            required: true,
          },
          {
            id: "q3",
            text: "What is the legal basis for processing?",
            type: "select",
            options: [
              "Consent (Art. 6(1)(a))",
              "Contract (Art. 6(1)(b))",
              "Legal obligation (Art. 6(1)(c))",
              "Vital interests (Art. 6(1)(d))",
              "Public interest (Art. 6(1)(e))",
              "Legitimate interests (Art. 6(1)(f))",
            ],
            required: true,
          },
          {
            id: "q4",
            text: "Is this systematic and extensive processing (Article 35(3)(b))?",
            type: "yes-no",
            required: true,
            helpText: "Systematic evaluation of personal aspects, including profiling",
          },
          {
            id: "q5",
            text: "Are you processing data on a large scale? (Article 35(3)(c))",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-sensitive",
        title: "Sensitive & Special Category Data",
        description: "Assessment of sensitive data handling (Article 9)",
        questions: [
          {
            id: "q6",
            text: "Are you processing any special category (sensitive) data under Article 9?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q7",
            text: "If yes, which explicit condition under Article 9 is being relied upon?",
            type: "text",
            helpText: "e.g., explicit consent, employment law, vital interests, etc.",
          },
          {
            id: "q8",
            text: "Are you processing data concerning criminal convictions (Article 10)?",
            type: "yes-no",
          },
        ],
      },
      {
        id: "sec-data-subjects",
        title: "Data Subjects & Sources",
        description: "Who the data belongs to and where it comes from",
        questions: [
          {
            id: "q9",
            text: "Who are the data subjects?",
            type: "checkbox",
            options: [
              "Employees",
              "Customers/clients",
              "Prospects/leads",
              "Suppliers/vendors",
              "Children (under 16)",
              "Vulnerable individuals",
              "End users of public",
            ],
            required: true,
          },
          {
            id: "q10",
            text: "Where is the data obtained from?",
            type: "checkbox",
            options: [
              "Directly from data subjects",
              "Third-party sources",
              "Public registers",
              "Automated collection (tracking)",
              "Partner organizations",
              "Other (specify)",
            ],
          },
        ],
      },
      {
        id: "sec-sharing",
        title: "Data Sharing & Transfers",
        description: "Third-party sharing and international transfers",
        questions: [
          {
            id: "q11",
            text: "Will data be shared with any third parties or processors?",
            type: "text",
            helpText: "List them and their roles",
          },
          {
            id: "q12",
            text: "Are there any international data transfers outside the EU/EEA?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q13",
            text: "If yes, what transfer mechanism is used? (Chapter V)",
            type: "select",
            options: [
              "Adequacy decision",
              "Standard Contractual Clauses (SCCs)",
              "Binding Corporate Rules (BCRs)",
              "Derogations",
              "Not applicable",
            ],
          },
          {
            id: "q14",
            text: "Is a Data Processing Agreement (DPA) in place with all processors?",
            type: "yes-no",
          },
        ],
      },
      {
        id: "sec-retention",
        title: "Retention & Erasure",
        description: "Data lifecycle management",
        questions: [
          {
            id: "q15",
            text: "What is the data retention period?",
            type: "text",
            helpText: "e.g., 24 months after account closure",
          },
          {
            id: "q16",
            text: "Is the retention period documented and legally justified?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q17",
            text: "Do you have automated processes for data erasure and the right to be forgotten?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-risk",
        title: "Risk Assessment",
        description: "Identify and evaluate risks to data subjects",
        questions: [
          {
            id: "q18",
            text: "What risks to the rights and freedoms of data subjects have been identified?",
            type: "textarea",
            required: true,
            helpText: "Consider: data breach, unauthorized access, unlawful processing, data loss",
          },
          {
            id: "q19",
            text: "What mitigation measures are planned or in place?",
            type: "textarea",
            required: true,
          },
          {
            id: "q20",
            text: "Overall residual risk level after mitigation:",
            type: "select",
            options: ["Low", "Medium", "High"],
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "tmpl-ccpa-pia",
    name: "CCPA/CPRA Privacy Impact Assessment",
    regulation: "CCPA",
    version: "1.3",
    description: "PIA template for Californian consumer privacy compliance",
    sections: [
      {
        id: "sec-intro",
        title: "Processing Overview",
        description: "Overview of consumer data processing",
        questions: [
          {
            id: "q1",
            text: "Describe the business purpose for collecting consumer personal information?",
            type: "textarea",
            required: true,
          },
          {
            id: "q2",
            text: "Which categories of personal information are collected? (CPRA Section 1798.140)",
            type: "checkbox",
            options: [
              "Identifiers (name, address, IP)",
              "Personal info categories (Cal. Civ. Code)",
              "Commercial information",
              "Internet activity",
              "Geolocation data",
              "Sensory data",
              "Professional/employment info",
              "Inferences from profiling",
              "Sensitive personal information",
            ],
            required: true,
          },
          {
            id: "q3",
            text: "Does the collection involve sensitive personal information?",
            type: "yes-no",
            helpText: "SSN, driver's license, account credentials, precise geolocation, etc.",
          },
        ],
      },
      {
        id: "sec-sale",
        title: "Sale & Sharing of Information",
        description: "Assessment of data sharing practices",
        questions: [
          {
            id: "q4",
            text: "Do you sell or share personal information? (as defined by CCPA)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q5",
            text: "If yes, is there a 'Do Not Sell/Share My Personal Information' link on your website?",
            type: "yes-no",
          },
          {
            id: "q6",
            text: "Do you have a mechanism to honor opt-out requests?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-rights",
        title: "Consumer Rights",
        description: "Measures to fulfill CCPA consumer rights",
        questions: [
          {
            id: "q7",
            text: "Have you implemented processes to handle access requests (Right to Know)?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q8",
            text: "Have you implemented processes to handle deletion requests?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q9",
            text: "Have you implemented processes for correction and opt-out of automated decision-making?",
            type: "yes-no",
          },
        ],
      },
      {
        id: "sec-security",
        title: "Security & Risk",
        description: "Data security measures and risk assessment",
        questions: [
          {
            id: "q10",
            text: "Describe the security measures protecting personal information",
            type: "textarea",
            required: true,
          },
          {
            id: "q11",
            text: "Have you assessed the risk of a data breach and its impact on consumers?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q12",
            text: "Are service providers required to conform to the CCPA/CPRA provisions via contract?",
            type: "yes-no",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "tmpl-hipaa-pia",
    name: "HIPAA Privacy & Security Assessment",
    regulation: "HIPAA",
    version: "1.2",
    description: "PIA template for Protected Health Information (PHI) handling",
    sections: [
      {
        id: "sec-phi",
        title: "PHI Processing",
        description: "Assessment of Protected Health Information processing",
        questions: [
          {
            id: "q1",
            text: "Describe the purpose of PHI processing",
            type: "textarea",
            required: true,
          },
          {
            id: "q2",
            text: "Which types of PHI are involved?",
            type: "checkbox",
            options: [
              "Demographic information",
              "Medical records",
              "Lab results",
              "Prescription data",
              "Insurance/billing info",
              "Mental health records",
              "Genetic information",
            ],
            required: true,
          },
          {
            id: "q3",
            text: "What is the minimum necessary standard applied? (HIPAA §164.502(b))",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-security",
        title: "Security Safeguards",
        description: "Administrative, physical, and technical safeguards",
        questions: [
          {
            id: "q4",
            text: "Are administrative safeguards in place? (risk analysis, workforce training)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q5",
            text: "Are physical safeguards in place? (facility access controls, workstation security)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q6",
            text: "Are technical safeguards in place? (access control, encryption, audit controls)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q7",
            text: "Is PHI encrypted in transit and at rest?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-ba",
        title: "Business Associates",
        description: "Business associate agreements and disclosures",
        questions: [
          {
            id: "q8",
            text: "Are Business Associate Agreements (BAAs) in place for all vendors handling PHI?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q9",
            text: "Are there any unauthorized disclosures or uses of PHI?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q10",
            text: "Do you have a breach notification process in place? (45 CFR §164.408)",
            type: "yes-no",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "tmpl-pipeda-pia",
    name: "PIPEDA Privacy Impact Assessment",
    regulation: "PIPEDA",
    version: "1.1",
    description: "PIA template for Canadian organizations handling personal information",
    sections: [
      {
        id: "sec-consent",
        title: "Consent & Accountability",
        description: "Assessment of consent framework (PIPEDA Principles 1-3)",
        questions: [
          {
            id: "q1",
            text: "Describe the purpose of collecting personal information under PIPEDA Fair Information Principles",
            type: "textarea",
            required: true,
          },
          {
            id: "q2",
            text: "What form of meaningful consent is obtained from individuals?",
            type: "select",
            options: ["Express consent", "Implied consent", "Both", "Not applicable"],
            required: true,
          },
          {
            id: "q3",
            text: "Is there a designated individual accountable for PIPEDA compliance?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-use",
        title: "Collection & Use of Information",
        description: "Limiting collection, use and disclosure",
        questions: [
          {
            id: "q4",
            text: "Is the collection limited to what is necessary for the identified purposes? (Principle 4)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q5",
            text: "Is personal information used only for the purposes for which it was collected? (Principle 5)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q6",
            text: "Are you disclosing information to third parties only with consent or as required by law? (Principle 6)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q7",
            text: "Do you have safeguards to protect personal information? (Principle 7)",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-accountability",
        title: "Openness & Compliance",
        description: "Openness, individual access and compliance",
        questions: [
          {
            id: "q8",
            text: "Is information about your privacy policies readily available to individuals? (Principle 8)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q9",
            text: "Can individuals access and challenge the accuracy of their personal information? (Principle 9)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q10",
            text: "Have you established procedures to receive and respond to complaints? (Principle 10)",
            type: "yes-no",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "tmpl-dpdpa-pia",
    name: "DPDPA Privacy Impact Assessment",
    regulation: "DPDPA",
    version: "1.0",
    description: "PIA template for Indian organizations under the Digital Personal Data Protection Act",
    sections: [
      {
        id: "sec-processing",
        title: "Data Processing Overview",
        description: "Overview of personal data processing under DPDPA",
        questions: [
          {
            id: "q1",
            text: "Describe the purpose of processing personal data",
            type: "textarea",
            required: true,
          },
          {
            id: "q2",
            text: "What is the legal basis for processing under DPDPA (Section 4-7)?",
            type: "select",
            options: [
              "Consent",
              "Contract",
              "Legal obligation",
              "Vital interests",
              "Public interest",
              "Legitimate interests",
            ],
            required: true,
          },
          {
            id: "q3",
            text: "Is the data classified as digital personal data?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q4",
            text: "Is consent obtained in a clear, free and specific manner with a notice?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-obligations",
        title: "Data Fiduciary Obligations",
        description: "Obligations of data fiduciaries under DPDPA",
        questions: [
          {
            id: "q5",
            text: "Have you implemented reasonable security safeguards (Section 8)",
            type: "yes-no",
            required: true,
          },
          {
            id: "q6",
            text: "Are you in compliance with data breach notification obligations (Section 8(6))?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q7",
            text: "Do you have a grievance redressal mechanism (Section 13)?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q8",
            text: "Do you have measures to erase data when purpose is fulfilled (Section 8(7))?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-rights",
        title: "Data Principal Rights",
        description: "Rights of data principals",
        questions: [
          {
            id: "q9",
            text: "Have you implemented mechanisms for access and correction rights (Section 11)?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q10",
            text: "Have you implemented mechanisms for erasure and grievance rights?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q11",
            text: "Is there a mechanism to respond to consent withdrawal requests?",
            type: "yes-no",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "tmpl-pipl-pia",
    name: "PIPL Privacy Impact Assessment",
    regulation: "PIPL",
    version: "1.0",
    description: "PIA template for organizations handling personal information in China",
    sections: [
      {
        id: "sec-processing",
        title: "Personal Information Processing",
        description: "Overview of personal information processing under PIPL",
        questions: [
          {
            id: "q1",
            text: "Describe the purpose of processing personal information",
            type: "textarea",
            required: true,
          },
          {
            id: "q2",
            text: "What is the basis of legitimacy for processing (Article 13)?",
            type: "select",
            options: [
              "Consent",
              "Contract",
              "Legal obligation",
              "Public health",
              "News reporting",
              "Public interest",
            ],
            required: true,
          },
          {
            id: "q3",
            text: "Is separate consent required for sensitive personal information (Article 29)?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q4",
            text: "Are you required to conduct a Personal Information Protection Impact Assessment (Article 55)?",
            type: "yes-no",
            required: true,
            helpText: "Required for: sensitive PI processing, automated decision-making, entrusting/outsourcing, providing PI to others, cross-border transfers",
          },
          {
            id: "q5",
            text: "Have you established a personal information protection officer or representative (Article 52)?",
            type: "yes-no",
            required: true,
          },
        ],
      },
      {
        id: "sec-crossborder",
        title: "Cross-Border Transfers",
        description: "Cross-border data transfer requirements",
        questions: [
          {
            id: "q6",
            text: "Are any personal information cross-border transfers planned?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q7",
            text: "Which cross-border mechanism is used (Article 38)?",
            type: "select",
            options: [
              "Security assessment by CAC",
              "Standard contract with offshore recipient",
              "Certification (CAC/recognized authority)",
              "Not applicable",
            ],
          },
          {
            id: "q8",
            text: "Will data be stored locally as required (Article 36)?",
            type: "yes-no",
          },
        ],
      },
      {
        id: "sec-security",
        title: "Security & Risk Mitigation",
        description: "Data security measures and risk controls",
        questions: [
          {
            id: "q9",
            text: "Describe the security measures implemented per Article 51",
            type: "textarea",
            required: true,
          },
          {
            id: "q10",
            text: "Do you have a personal information security incident emergency plan (Article 57)?",
            type: "yes-no",
            required: true,
          },
          {
            id: "q11",
            text: "Are you compliant with audit obligations for entrusted processing (Article 21)?",
            type: "yes-no",
            required: true,
          },
        ],
      },
    ],
  },
];

export function getTemplateById(id: string): AssessmentTemplate | undefined {
  return assessmentTemplates.find((t) => t.id === id);
}

export function getTemplatesByRegulation(regulation: string): AssessmentTemplate[] {
  return assessmentTemplates.filter((t) => t.regulation === regulation);
}
