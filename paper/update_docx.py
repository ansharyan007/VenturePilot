"""Update the copied paper from the checked-in evaluation CSVs; source DOCX is read-only."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
import subprocess, tempfile

root = Path(__file__).resolve().parents[1]
source = Path('/Users/aniket/Downloads/BuildMyIdea_AEI_submission (2).docx')
target = root / 'paper/BuildMyIdea_AEI_submission_revised.docx'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
ET.register_namespace('w', ns['w'])

changes = {
  'Abstract—Founders of electronics startups': 'Abstract—Founders of electronics startups usually keep product specifications, component costs, manufacturing capacity, compliance, finance and launch milestones in separate documents, although each decision constrains the others. This paper presents BuildMyIdea, a venture-planning and decision-support platform that holds these modules in one structured workspace. Deterministic functions produce quantities, while LLM agents interpret retrieved evidence. Built with React, TypeScript and Firebase, the platform computes BOM cost, unit economics, break-even volume, manufacturing capacity and a nine-stage readiness score. An optional Node.js service uses Nomic Embed Text and exact cosine retrieval over an owner- and venture-scoped SQLite index, with a deterministic router, up to two Qwen3 8B specialists, and a reviewer. A reproducible evaluation used 24 frozen NovaEdge questions (12 development and 12 held-out), three randomized repeats per mode, and Qwen3 8B. Combined macro rule-check pass rates were 85.9% for direct prompting, 53.1% for RAG, and 46.5% for the full pipeline; mean latencies were 125.6 s, 15.7 s, and 116.7 s. Four full-pipeline development runs timed out and were retained as failures. The rule checks are not semantic or human-quality evaluation.',
  'a working implementation on locally served open-weight models, examined through verification checks': 'a working implementation on locally served open-weight models, examined through verification checks, an analytic reproduction of the demo venture indicators, a code audit, and a frozen 24-question evaluation with development and held-out sets.',
  'A separate comparison was run on 14 Oct. 2026': 'The original 14 Oct. 2026 evaluation files were lost. The evaluation was rebuilt with frozen questions and rerun at repository head using Qwen3 8B (Q4_K_M) for generation and Nomic Embed Text for embeddings. These results describe the later revision, not the Qwen2.5/Llama configuration described in Section 6.',
  'Three configurations were compared on the same model. LLM with direct access': 'Three configurations were compared on Qwen3 8B: direct prompting with the serialized workspace; RAG with question embedding, five highest-cosine records, and one generation call; and the complete application pipeline with routing, role-based retrieval, specialist(s), reviewer, and guardrails. The evaluation contains 24 frozen questions and three repeats per mode (216 records). Answers were scored after thinking-text separation. Pass rate is the question-level mean of predicate fractions; evidence recall is |R intersection G|/|G| and is undefined for direct prompting. RAG document-index construction is excluded once per evaluation, while query embedding and retrieval are timed; full-mode timing includes the complete pipeline.',
  'Fig. 4 shows the results. BuildMyIdea reached': 'Fig. 4 reports combined development and held-out results. Direct prompting has the highest macro rule-check pass rate (85.9%; 95% bootstrap CI 72.7%–97.0%), followed by RAG (53.1%; 35.4%–70.8%) and the full pipeline (46.5%; 28.9%–64.4%). Evidence recall is 53.8% for RAG and 47.7% for the full pipeline; it is undefined for direct prompting. Pooled predicate totals are 174/201, 106/201, and 89/201. Four full-pipeline records timed out and remain in the analysis as failed runs.',
  'Fig. 4. Rule-check pass rate': 'Fig. 4. Combined macro rule-check pass rate and evidence recall over 24 frozen questions with three repeats per mode. Error bars show 95% question-level bootstrap confidence intervals (10,000 fixed-seed resamples). Recall is undefined for direct prompting.',
  'These values are descriptive. The same questions were employed': 'These values are descriptive rather than a claim of semantic correctness or general superiority. The predicates check specified terms and numeric facts, not factual entailment or usefulness. One illustrative venture and one local hardware/model setup were used; direct prompting has an advantage on this small fully serialized fixture. Development and held-out sets are reported separately in the released data. No answer retained thinking text, and the four full-pipeline timeouts were not rerun or discarded.',
  'Fig. 5 plots the rule-check pass rate from Fig. 4': 'Fig. 5 plots combined macro pass rate against mean latency. Direct prompting is 125.6 s at 85.9%, RAG is 15.7 s at 53.1%, and the full pipeline is 116.7 s at 46.5%. This frozen rule-check evaluation therefore does not show a quality advantage for the full pipeline on this fixture, while it is substantially slower than RAG. Latency is wall-clock time on the reported Apple M4 environment and varies with local load; four full runs timed out.',
  'Fig. 5. Quality versus latency': 'Fig. 5. Mean latency versus combined macro rule-check pass rate for three modes over 24 questions and three repeats. Pass-rate error bars are 95% question-level bootstrap intervals.',
  'Several limitations exist. End-to-end authenticated execution has not been validated': 'Several limitations exist. The evaluation uses one illustrative venture, frozen term-based predicates rather than human ratings or semantic entailment, and one local hardware/model configuration. Four full-pipeline runs timed out. Direct prompting receives the entire serialized fixture, so it is not representative of larger or private workspace contexts. Readiness assesses field completeness, not venture viability; citation validation checks identifiers, not support; and government evidence is sparse and India-specific.',
  'Apart from a small development-set comparison, the quality of the AI reports has not been assessed yet.': 'The frozen evaluation reports rule-check, evidence-recall, and latency outcomes across development and held-out questions, but it does not establish semantic quality, generalization, or decision usefulness.'
  ,'Table XI details the metrics that need to be measured prior to making any claims': 'Table XI lists evaluation still required beyond the completed frozen rule-check, evidence-recall, and latency experiment. Human-rated quality, semantic faithfulness, reviewer ablations, broader ventures, and authenticated end-to-end tests remain necessary.'
  ,'STATUS: Not yet evaluated, except partial evaluation': 'STATUS: Frozen rule-check, evidence-recall, and latency evaluation completed; the remaining measures are not yet evaluated.'
}

def paragraph_text(p): return ''.join(t.text or '' for t in p.findall('.//w:t', ns))
def put(p, value):
    ts = p.findall('.//w:t', ns); ts[0].text = value
    for t in ts[1:]: t.text = ''
def chart(path, points):
    w,h=900,600; data=bytearray([255,255,255])*(w*h)
    def box(x0,y0,x1,y1,c):
        for y in range(max(y0,0),min(y1,h)):
            for x in range(max(x0,0),min(x1,w)):
                i=(y*w+x)*3; data[i:i+3]=bytes(c)
    box(80,500,850,504,(0,0,0)); box(80,60,84,504,(0,0,0))
    for x,y,c in points: box(x-14,y-14,x+15,y+15,c)
    path.write_bytes(f'P6\n{w} {h}\n255\n'.encode()+data)

def bar_chart(path):
    w,h=900,600; data=bytearray([255,255,255])*(w*h)
    def box(x0,y0,x1,y1,c):
        for y in range(max(y0,0),min(y1,h)):
            for x in range(max(x0,0),min(x1,w)):
                i=(y*w+x)*3; data[i:i+3]=bytes(c)
    box(80,500,850,504,(0,0,0)); box(80,60,84,504,(0,0,0))
    # Blue: pass rate. Green: evidence recall (not defined for direct).
    for x,value,color in [(190,.859,(52,101,164)),(330,.531,(52,101,164)),(400,.538,(78,154,6)),(570,.465,(52,101,164)),(640,.477,(78,154,6))]:
        box(x,500-round(value*400),x+54,500,color)
    path.write_bytes(f'P6\n{w} {h}\n255\n'.encode()+data)

with ZipFile(source) as zin, tempfile.TemporaryDirectory() as td:
    doc=ET.fromstring(zin.read('word/document.xml')); changed=[]
    for p in doc.findall('.//w:p',ns):
        text=paragraph_text(p)
        for needle,value in changes.items():
            if needle in text: put(p,value); changed.append(needle); break
    missing=set(changes)-set(changed)
    if missing: raise SystemExit('Unmatched paragraphs: '+repr(missing))
    td=Path(td); p4=td/'four.ppm'; p5=td/'five.ppm'; j4=td/'four.jpg'; j5=td/'five.jpg'
    bar_chart(p4)
    chart(p5,[(770,500-round(.859*400),(52,101,164)),(166,500-round(.531*400),(78,154,6)),(720,500-round(.465*400),(204,0,0))])
    subprocess.run(['sips','-s','format','jpeg',str(p4),'--out',str(j4)],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['sips','-s','format','jpeg',str(p5),'--out',str(j5)],check=True,stdout=subprocess.DEVNULL)
    with ZipFile(target,'w',ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename=='word/document.xml': zout.writestr(item,ET.tostring(doc,encoding='utf-8',xml_declaration=True))
            elif item.filename=='word/media/image4.jpg': zout.write(j4,item.filename)
            elif item.filename=='word/media/image5.jpg': zout.write(j5,item.filename)
            else: zout.writestr(item,zin.read(item.filename))
print(f'Updated {len(changed)} paper paragraphs and Figures 4–5: {target}')
