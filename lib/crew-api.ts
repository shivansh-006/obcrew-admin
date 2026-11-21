import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ---------- Types (match obpark-backend) ----------

export type ServiceType = 'DRIVER' | 'MECHANIC';

export type OnboardingType = 'FREELANCE' | 'VENDOR_AFFILIATED';

export type KycStatus =
  | 'PENDING'
  | 'DRAFT'
  | 'DOCUMENTS_PENDING'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

export type DocumentType =
  | 'PAN'
  | 'SKILL_CERTIFICATE'
  | 'BANK_PASSBOOK'
  | 'AADHAAR'
  | 'DRIVING_LICENSE'
  | 'TRADE_SKILL_CERTIFICATE'
  | 'WORKSHOP_REGISTRATION'
  | 'COMMERCIAL_INSURANCE'
  | 'PROFILE_PHOTO';

export type DocReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ACTION_REQUIRED';

export interface CrewListDocument {
  id: string;
  docType: DocumentType;
  status: DocReviewStatus;
}

export interface CrewListItem {
  id: string;
  fullName: string | null;
  serviceType: ServiceType;
  onboardingType?: OnboardingType | null;
  kycStatus: KycStatus;
  submittedAt: string | null;
  user: { phoneNumber: string | null; email: string | null };
  documents: CrewListDocument[];
}

export interface CrewListResponse {
  data: CrewListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CrewDocument {
  id: string;
  docType: DocumentType;
  status: DocReviewStatus;
  rejectionReason: string | null;
  isLocked: boolean;
  verifiedById: string | null;
  createdAt: string;
  fileUrl: string;
}

export interface CrewDetails {
  id: string;
  fullName: string | null;
  serviceType: ServiceType;
  onboardingType?: OnboardingType | null;
  kycStatus: KycStatus;
  submittedAt?: string | null;
  user: { id: string; email: string | null; phoneNumber: string | null; isActive: boolean };
  documents: CrewDocument[];
}

export interface CrewListParams {
  serviceType?: ServiceType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReviewDocumentBody {
  status: 'ACCEPTED' | 'REJECTED' | 'ACTION_REQUIRED';
  rejectionReason?: string;
}

export interface VerifyCrewBody {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

// ---------- Errors ----------

export class CrewApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CrewApiError';
    this.status = status;
  }
}

// ---------- Request helper ----------

type QueryValue = string | number | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toError(res: Response): Promise<CrewApiError> {
  let message = '';
  try {
    const body = await res.json();
    if (Array.isArray(body?.message)) message = body.message.join(', ');
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // no JSON body
  }

  if (!message) {
    if (res.status === 401) message = 'Your session has expired. Please sign in again.';
    else if (res.status === 403) message = 'You do not have access to crew verification.';
    else if (res.status === 404) message = 'Crew member or document not found.';
    else message = `Request failed (${res.status}).`;
  }
  return new CrewApiError(res.status, message);
}

async function send(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, QueryValue> } = {}
): Promise<Response> {
  const { method = 'GET', body, query } = init;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: {
        ...authHeader(),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new CrewApiError(0, 'Cannot reach the server. Check that the backend is running.');
  }
  if (!res.ok) throw await toError(res);
  return res;
}

// ---------- API functions ----------

export async function getPendingCrew(params: CrewListParams = {}): Promise<CrewListResponse> {
  const res = await send('/admin/crew/pending', {
    query: {
      serviceType: params.serviceType,
      search: params.search?.trim(),
      page: params.page,
      limit: params.limit,
    },
  });
  return res.json();
}

export async function getCrewDetails(id: string): Promise<CrewDetails> {
  const res = await send(`/admin/crew/${encodeURIComponent(id)}/details`);
  return res.json();
}

export async function getDocumentFile(id: string, docId: string): Promise<Blob> {
  const res = await send(
    `/admin/crew/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/file`
  );
  return res.blob();
}

export async function reviewDocument(id: string, docId: string, body: ReviewDocumentBody) {
  const res = await send(
    `/admin/crew/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
    { method: 'PATCH', body }
  );
  return res.json();
}

export async function verifyCrew(id: string, body: VerifyCrewBody) {
  const res = await send(`/admin/crew/${encodeURIComponent(id)}/verify`, {
    method: 'PATCH',
    body,
  });
  return res.json();
}