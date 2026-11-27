import { apiFetch, NetworkError } from '@/lib/api';

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
  init: { method?: 'GET' | 'PATCH'; body?: unknown; query?: Record<string, QueryValue> } = {}
): Promise<Response> {
  let res: Response;
  try {
    res = await apiFetch(path, { method: init.method, body: init.body, query: init.query });
  } catch (err) {
    if (err instanceof NetworkError) throw new CrewApiError(0, err.message);
    throw err;
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


// ---------- Dashboard helpers ----------

export interface CrewSurveillanceItem {
  id: string;
  fullName: string | null;
  serviceType: ServiceType;
  isOnline: boolean;
  isBusy: boolean;
  avgRating: number | string | null;
  liveStatus: 'ON_TRIP' | 'IDLE';
  location: unknown | null;
  activeBookingCode: string | null;
  user?: { phoneNumber: string | null };
}

export interface CrewSurveillanceResponse {
  total: number;
  liveLocation: 'available' | 'unavailable';
  data: CrewSurveillanceItem[];
}

/** Number of approved crew for one service type (uses the list total). */
export async function getCrewCount(serviceType: ServiceType): Promise<number> {
  const res = await send('/admin/crew', {
    query: { kycStatus: 'APPROVED', serviceType, limit: 1 },
  });
  const body: CrewListResponse = await res.json();
  return body.total ?? 0;
}

/** Approved crew who are online or on a trip right now. */
export async function getCrewSurveillance(): Promise<CrewSurveillanceResponse> {
  const res = await send('/admin/crew/surveillance');
  return res.json();
}

/**
 * Newest pending crew, newest first.
 * The backend lists pending crew oldest first, so read the last items instead.
 */
export async function getNewestPendingCrew(
  count = 3
): Promise<{ total: number; data: CrewListItem[] }> {
  const { total } = await getPendingCrew({ limit: 1 });
  if (total === 0) return { total, data: [] };

  const start = Math.max(0, total - count); // position of the first item we need
  const firstPage = Math.floor(start / count) + 1;
  const lastPage = Math.floor((total - 1) / count) + 1;

  const pages = await Promise.all(
    Array.from({ length: lastPage - firstPage + 1 }, (_, i) =>
      getPendingCrew({ page: firstPage + i, limit: count })
    )
  );

  const items = pages.flatMap((p) => p.data);
  const offset = start - (firstPage - 1) * count;
  return { total, data: items.slice(offset, offset + count).reverse() };
}