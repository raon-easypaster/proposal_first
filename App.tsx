import React, { useState, useEffect, useRef } from 'react';
import { Building, FileText, Clipboard, Check, Sparkles, Send, Upload, File as FileIcon, X } from 'lucide-react';
import { AgencyInfo, ProjectInfo, FileData } from './types';
import { InputGroup } from './components/InputGroup';
import { generateProposalFromGemini } from './services/geminiService';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({
    name: '',
    representative: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    foundingDate: '',
    mainBusiness: '',
  });

  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: '',
    keywords: '',
    target: '',
    participantCount: '',
    location: '',
    budget: '',
    projectPeriod: '',
  });

  const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [proposalResult, setProposalResult] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for scrolling
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAgencyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgencyInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // Check file size (e.g., 20MB limit for browser handling safety)
    if (file.size > 20 * 1024 * 1024) {
      alert('파일 크기는 20MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        name: file.name,
        mimeType: file.type,
        data: base64String
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Construct the prompt whenever inputs change
  useEffect(() => {
    let prompt = `
당신은 대한민국 사회복지공동모금회(사랑의열매) 배분 신청 사업계획서 작성 전문 컨설턴트입니다.
아래 제공된 기관 정보와 사업 개요를 바탕으로, 심사위원이 즉시 채택할 수 있는 수준의 **구체적이고, 논리적이며, 전문적인** 사업계획서를 작성해주세요.

[필수 지침]
1. **서술 방식**: 전문적인 사회복지 용어를 적절히 사용하되, 문장은 명료하고 힘 있게 작성하십시오.
2. **포맷팅(중요)**: 
   - **빈 줄 최소화**: 불필요한 엔터(공백 라인)를 제거하여 문서를 컴팩트하게 만드세요.
   - **가독성**: 주요 내용은 볼드체(**)로 강조하세요.
3. **시각화(인포그래픽)**: 
   - 텍스트만 나열하지 말고, 내용의 이해를 돕기 위한 인포그래픽 삽입 위치와 내용을 제안하세요.
   - 표기법: \`> 🖼️ **[인포그래픽 제안]** (제목): (내용 설명)\`
4. **평가 및 예산**: 반드시 **마크다운 표(Table)** 형식을 사용하여 구조화해서 보여주세요.

---
`;

    if (attachedFile) {
      prompt += `
[참고 자료]
첨부된 PDF 파일은 해당 사업의 공고문 또는 관련 자료입니다. 이 내용을 철저히 분석하여 제안서에 반영해주세요.
---
`;
    }

    prompt += `
## 1. 신청 기관 정보
- 기관명: ${agencyInfo.name || '(미입력)'}
- 대표자: ${agencyInfo.representative || '(미입력)'}
- 설립일: ${agencyInfo.foundingDate || '(미입력)'}
- 주요 사업: ${agencyInfo.mainBusiness || '(미입력)'}
- 소재지: ${agencyInfo.address || '(미입력)'}

## 2. 사업 개요
- **사업명**: ${projectInfo.title || '(미입력)'}
- **핵심 키워드**: ${projectInfo.keywords || '(미입력)'}
- 사업 대상: ${projectInfo.target || '(대상 미지정)'}
- 참여 인원: ${projectInfo.participantCount || '(인원 미정)'}
- 사업 장소: ${projectInfo.location || '(장소 미정)'}
- 총 예산: ${projectInfo.budget || '(예산 미정)'}
- 사업 기간: ${projectInfo.projectPeriod || '(기간 미정)'}

## 3. 작성 요청 목차 및 가이드
아래 목차에 따라 내용을 작성하되, 각 항목은 **최소 300자 이상** 상세하게 기술하세요.

### 1) 사업의 필요성
- 대상자의 욕구 및 문제점 (통계 자료나 실태 조사 결과를 가상의 데이터로 인용하여 신뢰도 확보)
- 지역사회 환경적 특성 및 사업의 시급성
- 기존 사업과의 차별성
- *> 🖼️ [인포그래픽 제안] 문제 나무(Problem Tree) 또는 욕구 분석 도표*

### 2) 서비스 지역, 서비스 대상 및 실인원수
- 산출 근거를 논리적으로 제시 (일반집단 -> 위기집단 -> 표적집단 -> 실인원)
- 위 과정을 **표(Table)** 또는 도식화된 텍스트로 표현

### 3) 사업 목적 및 목표
- 산출목표(Output)와 성과목표(Outcome)로 구분하여 제시
- 목표는 구체적이고 측정 가능해야 함 (SMART 기법 적용)

### 4) 사업 내용
- 세부사업명, 일정, 수행인력, 수행방법, 진행내용을 상세히 기술
- 키워드 반영: ${projectInfo.keywords}
- *> 🖼️ [인포그래픽 제안] 사업 추진 절차도(Flowchart)*

### 5) 예산 계획
- 산출 내역을 구체적으로 기재 (단가 x 수량 x 횟수 등)
- 총 예산: ${projectInfo.budget || '적정 규모'} (비목: 인건비, 사업비, 관리운영비 등)
- **표(Table) 형식 필수**

### 6) 평가 계획 (중요)
- 성과 목표에 따른 평가 지표, 측정도구, 평가 방법 및 시기를 구체적으로 제시
- **아래 양식의 마크다운 표(Table)로 작성해주세요:**
  | 성과목표 | 성과지표 | 측정도구 | 평가방법 | 평가시기 |
  |---|---|---|---|---|
  | (내용) | (내용) | (내용) | (내용) | (내용) |

### 7) 기대 효과
- 참여자(대상자)의 변화
- 지역사회의 변화 및 파급 효과
- *> 🖼️ [인포그래픽 제안] 변화 전후 비교 또는 기대효과 구조도*

`.trim();
    setGeneratedPrompt(prompt);
  }, [agencyInfo, projectInfo, attachedFile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateProposal = async () => {
    if (!projectInfo.title) {
      alert("사업명은 필수 입력 사항입니다.");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateProposalFromGemini(generatedPrompt, attachedFile || undefined);
      setProposalResult(result);
      // Scroll to result after a short delay to ensure rendering
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error(error);
      alert("제안서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">사회복지사 사업계획서 프롬프트 생성기</h1>
            <p className="text-xs text-slate-500 font-medium">사회복지공동모금회 배분신청서 표준 양식 기반</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs (5/12 width) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Agency Info */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Building size={16} className="text-blue-600" />
              <h2 className="font-bold text-slate-700">1. 신청기관 정보</h2>
            </div>
            <div className="p-5 grid grid-cols-1 gap-3">
              <InputGroup label="기관명" name="name" value={agencyInfo.name} onChange={handleAgencyChange} placeholder="OO종합사회복지관" />
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="대표자" name="representative" value={agencyInfo.representative} onChange={handleAgencyChange} />
                <InputGroup label="설립일" name="foundingDate" value={agencyInfo.foundingDate} onChange={handleAgencyChange} type="date" />
              </div>
              <InputGroup label="주소" name="address" value={agencyInfo.address} onChange={handleAgencyChange} />
              <InputGroup label="주요 사업 분야" name="mainBusiness" value={agencyInfo.mainBusiness} onChange={handleAgencyChange} placeholder="예: 노인복지, 사례관리" />
            </div>
          </section>

          {/* Section 2: Project Info */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
             <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="font-bold text-slate-700">2. 사업 정보 (상세)</h2>
            </div>
            <div className="p-5 space-y-4">
              <InputGroup 
                label="사업명 (필수)" 
                name="title" 
                value={projectInfo.title} 
                onChange={handleProjectChange} 
                placeholder="예: 독거노인 우울감 해소를 위한 원예 프로그램" 
                required
              />
              <InputGroup 
                label="핵심 키워드" 
                name="keywords" 
                value={projectInfo.keywords} 
                onChange={handleProjectChange} 
                placeholder="예: 정서지원, 자조모임, 마을공동체" 
                type="textarea"
              />

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">세부 정보 (선택)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="사업 대상" name="target" value={projectInfo.target || ''} onChange={handleProjectChange} placeholder="예: 우울군 노인 30명" />
                  <InputGroup label="참여 인원" name="participantCount" value={projectInfo.participantCount || ''} onChange={handleProjectChange} placeholder="예: 30명" />
                  <InputGroup label="총 예산" name="budget" value={projectInfo.budget || ''} onChange={handleProjectChange} placeholder="예: 10,000,000원" />
                  <InputGroup label="사업 기간" name="projectPeriod" value={projectInfo.projectPeriod || ''} onChange={handleProjectChange} placeholder="예: 2024.03-12" />
                  <div className="col-span-2">
                    <InputGroup label="사업 장소" name="location" value={projectInfo.location || ''} onChange={handleProjectChange} placeholder="예: 복지관 프로그램실" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: File Upload */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
             <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Upload size={16} className="text-blue-600" />
              <h2 className="font-bold text-slate-700">3. 공고문/참고자료 (PDF)</h2>
            </div>
            <div className="p-5">
              {!attachedFile ? (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group/upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover/upload:bg-blue-100 transition-colors">
                    <FileIcon className="h-6 w-6 text-slate-400 group-hover/upload:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">클릭하여 PDF 업로드</p>
                  <p className="text-xs text-slate-400 mt-1">공고문 등을 첨부하면 AI가 분석합니다 (최대 20MB)</p>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="text-red-500 h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{attachedFile.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Prompt & Action (7/12 width) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Prompt Preview */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[500px]">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="font-bold text-slate-700">생성된 프롬프트 미리보기</h2>
              </div>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${copied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? '복사완료' : '프롬프트 복사'}
              </button>
            </div>
            
            <div className="p-4 flex-grow overflow-y-auto bg-slate-50/50">
              <div className="bg-slate-800 text-slate-200 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap shadow-inner leading-relaxed border border-slate-700">
                {generatedPrompt}
              </div>
            </div>
          </section>

           {/* Action Button */}
           <button
            onClick={handleGenerateProposal}
            disabled={isGenerating || !projectInfo.title}
            className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-md ${
              isGenerating || !projectInfo.title
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                AI가 사업계획서를 작성하고 있습니다... (약 1분 소요)
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-yellow-300" />
                사업계획서 생성하기
              </>
            )}
          </button>

          {/* Result Area */}
          {proposalResult && (
            <section className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" ref={resultRef}>
               <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white border-b border-slate-800">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <FileText size={20} className="text-blue-400" />
                  제안서 초안 결과
                </h2>
                <button 
                  onClick={() => {
                      navigator.clipboard.writeText(proposalResult);
                      alert('결과물이 복사되었습니다.');
                  }}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors text-slate-300"
                >
                  <Clipboard size={14} /> 전체 복사
                </button>
              </div>
              <div className="p-8 bg-white min-h-[500px]">
                <article className="prose prose-slate prose-sm md:prose-base max-w-none 
                  prose-headings:font-bold prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-lg prose-h3:text-blue-700
                  prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-2
                  prose-li:my-0
                  prose-strong:text-slate-900 prose-strong:font-bold
                  prose-table:border prose-table:border-slate-300 prose-table:text-sm
                  prose-th:bg-slate-100 prose-th:p-2 prose-th:border prose-th:border-slate-300
                  prose-td:p-2 prose-td:border prose-td:border-slate-300
                  prose-blockquote:bg-blue-50 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-4 prose-blockquote:not-italic
                ">
                  <ReactMarkdown>{proposalResult}</ReactMarkdown>
                </article>
              </div>
            </section>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;