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
당신은 전문적인 사회복지사 및 제안서 작성 전문가입니다.
사회복지공동모금회 배분 신청 사업계획서 표준 양식에 맞춰 아래 정보를 바탕으로 구체적이고 설득력 있는 사업계획서를 작성해주세요.
`;

    if (attachedFile) {
      prompt += `
[중요] 첨부된 PDF 파일은 해당 사업의 공고문 또는 참고자료입니다. 이 파일의 내용을 면밀히 분석하여, 공고의 취지, 심사 기준, 필수 포함 사항 등을 반영하여 제안서를 작성해주세요.
`;
    }

    prompt += `
## 1. 신청 기관 및 사업 정보
- 기관명: ${agencyInfo.name || '(미입력)'}
- 대표자: ${agencyInfo.representative || '(미입력)'}
- 주소: ${agencyInfo.address || '(미입력)'}
- 설립일: ${agencyInfo.foundingDate || '(미입력)'}
- 주요 사업: ${agencyInfo.mainBusiness || '(미입력)'}

## 2. 사업 개요 및 상세 내용
- 사업명: ${projectInfo.title || '(미입력)'}
- 핵심 키워드: ${projectInfo.keywords || '(미입력)'}
`;

    // Add optional fields
    if (projectInfo.target) prompt += `- 사업 대상: ${projectInfo.target}\n`;
    if (projectInfo.participantCount) prompt += `- 참여 인원: ${projectInfo.participantCount}\n`;
    if (projectInfo.location) prompt += `- 사업 장소: ${projectInfo.location}\n`;
    if (projectInfo.projectPeriod) prompt += `- 사업 기간: ${projectInfo.projectPeriod}\n`;
    if (projectInfo.budget) prompt += `- 총 예산: ${projectInfo.budget}\n`;

    prompt += `
## 3. 작성 요청 사항 (사회복지공동모금회 기준)
다음 목차에 따라 내용을 작성하되, **각 항목을 매우 구체적이고 상세하게(Detailed)** 기술하세요.
**[중요 포맷 가이드]**
1. **빈 줄 제거**: 단락 사이의 불필요한 빈 줄(개행)을 최소화하여 컴팩트하게 작성하세요.
2. **상세 서술**: 단순히 개조식으로만 나열하지 말고, 논리적 근거를 포함한 서술형 문장을 충분히 활용하세요.
3. **분량**: 각 항목별로 충분한 분량을 확보하여 깊이 있는 제안서가 되도록 해주세요.
4. **시각화 요소(인포그래픽) 포함**: 
   - 심사위원의 이해를 돕기 위해 **[인포그래픽 제안: (제목) - (내용 설명)]** 형식으로 시각 자료가 필요한 위치를 명시해주세요.
   - 예시: [인포그래픽 제안: 사업 추진 체계도 - 신청 기관과 협력 기관 간의 역할 분담 도식화]
   - 데이터, 일정, 예산, 평가 지표 등은 반드시 **마크다운 표(Table)** 로 정리하여 가독성을 높여주세요.

[목차]
1) 사업의 필요성 (문제 제기, 대상자의 욕구 및 문제점, 지역사회 환경적 특성)
2) 서비스 지역, 서비스 대상 및 실인원수 (산출 근거 포함)
3) 사업 목적 및 목표 (성과목표 및 산출목표를 구체적인 수치로 제시)
4) 사업 내용 (세부사업명, 일정, 수행인력, 수행방법, 진행내용 등 - 키워드: ${projectInfo.keywords})
5) 예산 계획 (개략적인 비목과 산출 근거${projectInfo.budget ? `, 총액 ${projectInfo.budget} 규모 준수` : ''})
6) 평가 계획 (평가 지표, 측정도구, 평가 방법 및 시기 - **표(Table)로 제시**)
7) 기대 효과 (참여자 변화, 지역사회 변화 등)

톤앤매너: 전문적이고 신뢰감을 주며, 사회적 가치를 강조하는 문체.
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
      alert("제안서 생성에 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">사회복지사 사업계획서 프롬프트 생성기</h1>
            <p className="text-xs text-slate-500">사회복지공동모금회 기준 양식 지원</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          
          {/* Section 1: Agency Info */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Building size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-800">1. 신청기관 정보</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="기관명" name="name" value={agencyInfo.name} onChange={handleAgencyChange} placeholder="OO종합사회복지관" />
              <InputGroup label="대표자" name="representative" value={agencyInfo.representative} onChange={handleAgencyChange} />
              <div className="md:col-span-2">
                <InputGroup label="주소" name="address" value={agencyInfo.address} onChange={handleAgencyChange} />
              </div>
              <InputGroup label="담당자" name="contactPerson" value={agencyInfo.contactPerson} onChange={handleAgencyChange} />
              <InputGroup label="연락처" name="phone" value={agencyInfo.phone} onChange={handleAgencyChange} />
              <InputGroup label="이메일" name="email" value={agencyInfo.email} onChange={handleAgencyChange} type="email" />
              <InputGroup label="설립일" name="foundingDate" value={agencyInfo.foundingDate} onChange={handleAgencyChange} type="date" />
              <div className="md:col-span-2">
                <InputGroup label="주요 사업 분야" name="mainBusiness" value={agencyInfo.mainBusiness} onChange={handleAgencyChange} placeholder="예: 노인복지, 지역사회조직, 사례관리 등" />
              </div>
            </div>
          </section>

          {/* Section 2: Project Info */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-800">2. 사업 정보 (필수 및 상세)</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <InputGroup 
                  label="사업명 (필수)" 
                  name="title" 
                  value={projectInfo.title} 
                  onChange={handleProjectChange} 
                  placeholder="예: 우리 마을 문제 해결을 위한 AI 융합 메이커 동아리 운영" 
                  required
                />
                <InputGroup 
                  label="핵심 키워드 및 강조점" 
                  name="keywords" 
                  value={projectInfo.keywords} 
                  onChange={handleProjectChange} 
                  placeholder="예: 기후 위기, AI 코딩, 지역 노인정 봉사, 학생 주도성" 
                  type="textarea"
                />
              </div>

              <div className="h-px bg-slate-100 my-4"></div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1">
                  <Clipboard size={14} /> 상세 정보 (선택)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="사업 대상" name="target" value={projectInfo.target || ''} onChange={handleProjectChange} placeholder="예: 지역 내 독거노인 50명" />
                  <InputGroup label="참여 인원" name="participantCount" value={projectInfo.participantCount || ''} onChange={handleProjectChange} placeholder="예: 20명" />
                  <div className="md:col-span-2">
                    <InputGroup label="사업 장소" name="location" value={projectInfo.location || ''} onChange={handleProjectChange} placeholder="예: 복지관 2층 강당 및 인근 경로당" />
                  </div>
                  <InputGroup label="총 예산" name="budget" value={projectInfo.budget || ''} onChange={handleProjectChange} placeholder="예: 50,000,000원" />
                  <InputGroup label="사업 기간" name="projectPeriod" value={projectInfo.projectPeriod || ''} onChange={handleProjectChange} placeholder="예: 2024.01 ~ 2024.12" />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: File Upload */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Upload size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-800">3. 사업 공고문 첨부 (PDF)</h2>
            </div>
            <div className="p-6">
              <div className="mb-2 text-sm text-slate-600">
                사업 공고문이나 가이드라인이 있다면 PDF로 첨부해주세요. AI가 내용을 분석하여 반영합니다.
              </div>
              
              {!attachedFile ? (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileIcon className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                  <p className="text-slate-600 font-medium">클릭하여 PDF 파일 업로드</p>
                  <p className="text-xs text-slate-400 mt-1">최대 20MB</p>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-white p-2 rounded shadow-sm">
                      <FileIcon className="text-red-500 h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">{attachedFile.name}</p>
                      <p className="text-xs text-slate-500">PDF 문서 첨부됨</p>
                    </div>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Prompt Preview & Action */}
        <div className="space-y-6">
          
          {/* Prompt Preview Card */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[600px] sticky top-24">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="font-semibold text-slate-800">생성된 프롬프트</h2>
              </div>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? '복사됨' : '복사하기'}
              </button>
            </div>
            
            <div className="p-4 flex-grow overflow-y-auto bg-slate-50/50">
              <div className="bg-slate-800 text-slate-100 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap shadow-inner leading-relaxed">
                {generatedPrompt}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
               <button
                onClick={handleGenerateProposal}
                disabled={isGenerating || !projectInfo.title}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                  isGenerating || !projectInfo.title
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI가 사업계획서를 작성 중입니다...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    AI로 사업계획서 초안 생성하기
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                * 생성된 내용은 참고용이며, 반드시 전문가의 검토가 필요합니다.
              </p>
            </div>
          </section>
        </div>

        {/* Full Width Result Area */}
        {proposalResult && (
          <div className="lg:col-span-2 pt-8 border-t border-slate-200" ref={resultRef}>
            <section className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
               <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-300" />
                  AI 생성 결과물
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                       navigator.clipboard.writeText(proposalResult);
                       alert('결과물이 복사되었습니다.');
                    }}
                    className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Clipboard size={16} /> 복사
                  </button>
                </div>
              </div>
              <div className="p-8 prose prose-slate prose-headings:my-2 prose-p:my-1 prose-li:my-0.5 max-w-none bg-white">
                <ReactMarkdown>{proposalResult}</ReactMarkdown>
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;