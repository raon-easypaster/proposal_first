import React, { useState, useEffect, useRef } from 'react';
import { Building, FileText, Clipboard, Check, Sparkles, Upload, File as FileIcon, X, Settings, Key } from 'lucide-react';
import { AgencyInfo, ProjectInfo, FileData } from './types';
import { InputGroup } from './components/InputGroup';
import { generateProposalFromGemini } from './services/geminiService';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  // State for API Key management
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

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
  const resultRef = useRef<HTMLDivElement>(null);

  // Initialize API Key from Env or LocalStorage
  useEffect(() => {
    // Try env vars first (Vite or Node), then localStorage
    // @ts-ignore
    const envKey = import.meta.env?.VITE_API_KEY || process.env?.API_KEY;
    const storedKey = localStorage.getItem('gemini_api_key');
    
    if (envKey) {
      setApiKey(envKey);
    } else if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowSettings(true); // Open settings if no key found
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

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

    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }
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

  // Construct the prompt
  useEffect(() => {
    let prompt = `
당신은 대한민국 사회복지공동모금회(사랑의열매) 배분 신청 사업계획서 작성 최고 전문가입니다.
제공된 정보를 바탕으로 **심사위원이 즉시 채택할 수 있는 수준의 구체적이고 전문적인** 사업계획서를 작성하십시오.

[엄격한 작성 원칙 - 반드시 준수할 것]
1. **서술 태도**: 신뢰감을 주는 전문적인 용어와 명료한 종결어미(~함, ~임, ~이어야 함)를 사용하십시오.
2. **레이아웃(매우 중요 - Compact Mode)**:
   - **빈 줄 제거**: 문단과 문단 사이, 리스트 항목 사이에 빈 줄을 넣지 마십시오. 정보의 밀도를 극대화하십시오.
   - 모든 내용은 빽빽하게 작성되어야 하며, 불필요한 여백을 최소화하십시오.
   - **강조**: 핵심 수치와 키워드는 굵게(**) 표시하십시오.
3. **시각적 요소(인포그래픽)**: 
   - 텍스트로만 구성하지 말고, 각 주요 섹션마다 **[인포그래픽 제안]**을 반드시 포함하십시오.
   - 양식: \`> 🖼️ **[인포그래픽 제안]** (제목): (구성 내용 설명)\`
4. **구체성**: 추상적인 표현(노력하겠다 등)을 지양하고, 구체적인 수치와 방법론을 제시하십시오.

---
`;

    if (attachedFile) {
      prompt += `
[참고 자료 분석 요청]
첨부된 PDF 파일(사업 공고문 또는 관련 자료)을 정밀 분석하여, 해당 공모전의 취지와 요구사항을 사업계획서에 완벽히 반영하십시오.
---
`;
    }

    prompt += `
## 1. 기관 현황
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

## 3. 상세 작성 요청 항목 (목차)
각 항목은 내용을 충실히 채워주십시오.

### 1) 사업의 필요성
- 대상자의 욕구 및 문제점 (통계/데이터 인용 스타일)
- 지역사회 환경적 특성 및 시급성
- 기존 유사 사업과의 차별성
- *> 🖼️ [인포그래픽 제안] 문제 분석도(Problem Tree) 또는 욕구 흐름도*

### 2) 서비스 지역 및 대상자 선정
- 서비스 대상 선정 기준 및 인원 산출 근거 (일반집단 > 위기집단 > 표적집단 > 실인원)
- **표(Table)** 형태로 정리하여 제시

### 3) 사업 목적 및 목표
- 산출목표(Output)와 성과목표(Outcome)로 명확히 구분
- SMART 기법 적용하여 구체적으로 기술

### 4) 사업 내용 (세부 프로그램)
- 프로그램명, 수행기간, 수행인력, 수행방법, 세부 진행내용 기술
- *> 🖼️ [인포그래픽 제안] 사업 추진 절차도(Process Flow)*

### 5) 예산 계획
- 산출 내역을 구체적으로 기재 (산출식: 단가 x 인원 x 횟수)
- **반드시 마크다운 표(Table)로 작성**

### 6) 평가 계획 (필수)
- 성과 목표 달성 여부를 측정하기 위한 구체적 계획
- **반드시 아래 양식의 마크다운 표(Table)로 작성:**
  | 평가 지표 | 측정도구 | 평가 방법 | 평가 시기 |
  |---|---|---|---|
  | (지표 내용) | (척도/설문지 등) | (사전사후검사 등) | (시기) |

### 7) 기대 효과
- 참여자(개인) 차원의 변화
- 지역사회(환경) 차원의 변화
- *> 🖼️ [인포그래픽 제안] 기대효과 구조도 또는 변화 전후 비교*
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
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProposalFromGemini(generatedPrompt, apiKey, attachedFile || undefined);
      setProposalResult(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error(error);
      alert("제안서 생성에 실패했습니다. API Key를 확인해주세요.");
      setShowSettings(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Settings size={20} /> API 설정
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Google Gemini API Key를 입력해주세요.<br/>
              이 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input 
                type="password" 
                placeholder="AIza..." 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                닫기
              </button>
              <button 
                onClick={() => saveApiKey(apiKey)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장하기
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">
                API Key 발급받기 &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">사회복지사 사업계획서 프롬프트 생성기</h1>
              <p className="text-xs text-slate-500 font-medium">사회복지공동모금회 배분신청서 표준 양식 기반</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            title="API 설정"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs (5/12 width) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Agency Info */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
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
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
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
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
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
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[400px]">
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
                AI가 사업계획서를 작성하고 있습니다...
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
                <div className="flex gap-2">
                   <button 
                    onClick={() => {
                        const blob = new Blob([proposalResult], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${projectInfo.title || '사업계획서'}_초안.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors text-slate-300"
                  >
                    <FileText size={14} /> MD 저장
                  </button>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(proposalResult);
                        alert('결과물이 복사되었습니다.');
                    }}
                    className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-600 border border-blue-600 px-3 py-1.5 rounded-lg transition-colors text-white font-medium"
                  >
                    <Clipboard size={14} /> 전체 복사
                  </button>
                </div>
              </div>
              <div className="p-8 bg-white min-h-[500px]">
                <article className="prose prose-slate prose-sm md:prose-base max-w-none 
                  prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-6 prose-headings:mb-3
                  prose-h1:text-2xl prose-h1:border-b-2 prose-h1:border-slate-100 prose-h1:pb-4
                  prose-h2:text-xl prose-h2:text-blue-800 prose-h2:border-l-4 prose-h2:border-blue-500 prose-h2:pl-3
                  prose-h3:text-lg prose-h3:text-slate-700
                  prose-p:leading-relaxed prose-p:text-slate-700
                  prose-strong:text-slate-900 prose-strong:font-bold prose-strong:bg-yellow-50 prose-strong:px-1
                  prose-ul:list-disc prose-ul:pl-5
                  prose-ol:list-decimal prose-ol:pl-5
                  prose-table:w-full prose-table:border-collapse prose-table:my-4 prose-table:text-sm
                  prose-th:bg-slate-100 prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-th:text-center prose-th:font-bold
                  prose-td:border prose-td:border-slate-300 prose-td:p-2
                  prose-blockquote:bg-blue-50 prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:text-blue-800 prose-blockquote:not-italic prose-blockquote:text-sm prose-blockquote:rounded-r
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