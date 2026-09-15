import type { RagDocument } from '../types'

// Curated snapshots from authoritative Government of India sources. Keep summaries
// short and factual; the URL remains the source of truth when requirements change.
export const COMPLIANCE_KNOWLEDGE_VERSION = '2026-09-09'

const sources: Array<Omit<RagDocument, 'kind' | 'updatedAt' | 'contentHash'>> = [
  {
    id: 'bis-crs-electronics',
    title: 'BIS Scheme II — Compulsory Registration for Electronics and IT Goods',
    content: 'BIS lists electronics and IT product categories covered by the Compulsory Registration Scheme. The current Scheme II list includes Laptop, Notebook and Tablet products against IS/IEC 62368 Part 1:2023. Applicability must be checked against the exact product category and current BIS notifications before manufacture, import or sale.',
    tags: ['bis', 'crs', 'product safety', 'laptop', 'notebook', 'tablet', 'electronics', 'certification'],
    sourceUrl: 'https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'dot-wpc-eta',
    title: 'DoT/WPC Equipment Type Approval (ETA)',
    content: 'The Department of Telecommunications states that WPC Equipment Type Approval applies to wireless devices operating in de-licensed frequency bands. Its official service page includes laptops and other computing devices as products that may use ETA through self-declaration and lists an RF test report, manufacturer authorization for an Indian representative, and technical literature among the documents required. Confirm the radio module, frequency band and import pathway for the exact product.',
    tags: ['wpc', 'eta', 'wireless', 'wifi', 'wi-fi', 'bluetooth', 'radio', 'rf', 'import', 'laptop'],
    sourceUrl: 'https://www.eservices.dot.gov.in/equipment-type-approval-eta',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'cpcb-ewaste-epr',
    title: 'CPCB — E-Waste (Management) Rules, 2022 FAQ',
    content: 'CPCB guidance under the E-Waste (Management) Rules, 2022 explains producer responsibilities for covered electrical and electronic equipment and the EPR framework. A business placing covered equipment under its own brand, offering imported equipment for sale, or importing used equipment can fall within the producer definition. Confirm whether the product is in Schedule I, then assess CPCB portal registration, EPR targets, recycling certificates and record-keeping before launch.',
    tags: ['cpcb', 'e-waste', 'ewaste', 'epr', 'producer', 'recycling', 'environment', 'electronics', 'importer'],
    sourceUrl: 'https://cpcb.gov.in/uploads/Projects/E-Waste/FAQ_ewaste_23012024.pdf',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'legal-metrology-packaged-commodities',
    title: 'Department of Consumer Affairs — Legal Metrology (Packaged Commodities) Rules',
    content: 'Retail pre-packaged goods may require declarations under the Legal Metrology (Packaged Commodities) Rules, including manufacturer, packer or importer details, country of origin where applicable, commodity name, quantity, MRP and consumer-care information. Use the consolidated rules and later amendments to validate the declarations for the exact package and sales channel.',
    tags: ['legal metrology', 'packaging', 'label', 'labeling', 'labelling', 'mrp', 'importer', 'consumer'],
    sourceUrl: 'https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/LM_PCR_All_Amendements.pdf',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'mca-spice-plus',
    title: 'Ministry of Corporate Affairs — SPICe+ Incorporation',
    content: 'MCA describes SPICe+ as the integrated web form used for company name reservation and incorporation. Its linked services can include CIN, DIN, PAN, TAN and optional GSTIN applications. Entity choice and ongoing filings should be reviewed with a qualified company secretary, chartered accountant or legal adviser.',
    tags: ['mca', 'company', 'incorporation', 'spice+', 'cin', 'pan', 'tan', 'business registration'],
    sourceUrl: 'https://www.mca.gov.in/content/dam/mca/pdf/SPICEplus-and-linked-filings-FAQs-V3-20230122.pdf',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'cbic-gst-registration',
    title: 'CBIC GST — Registration guidance',
    content: 'CBIC guidance explains that GST registration depends on aggregate turnover and also lists statutory exceptions that can require registration regardless of the general threshold. Interstate activity, e-commerce arrangements, product classification and place of supply can change the result. Validate the current Act, notifications and facts with a tax professional before relying on a threshold.',
    tags: ['gst', 'cbic', 'tax', 'registration', 'turnover', 'e-commerce', 'interstate'],
    sourceUrl: 'https://cbic-gst.gov.in/faq.html',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
  {
    id: 'dpiit-startup-recognition',
    title: 'Startup India — DPIIT Startup Recognition',
    content: 'Startup India publishes the current eligibility and application route for DPIIT recognition. Recognition is separate from incorporation and may provide access to specified startup benefits. Check the current entity type, age, turnover, innovation and original-entity criteria on the official page before applying through the National Single Window System.',
    tags: ['dpiit', 'startup india', 'recognition', 'nsws', 'tax benefit', 'startup registration'],
    sourceUrl: 'https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html',
    lastVerified: COMPLIANCE_KNOWLEDGE_VERSION,
  },
]

function hashText(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export const complianceKnowledge: RagDocument[] = sources.map((source) => ({
  ...source,
  kind: 'government-compliance',
  updatedAt: COMPLIANCE_KNOWLEDGE_VERSION,
  contentHash: hashText(`${source.title}|${source.content}|${source.sourceUrl}`),
}))

