export interface AgencyInfo {
  name: string;
  representative: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  foundingDate: string;
  mainBusiness: string;
}

export interface ProjectInfo {
  title: string;
  keywords: string;
  // Optional detailed info
  target?: string;
  participantCount?: string;
  location?: string;
  budget?: string;
  projectPeriod?: string;
}

export interface GeneratedContent {
  prompt: string;
  proposal?: string;
}

export interface FileData {
  data: string; // base64 encoded string
  mimeType: string;
  name: string;
}