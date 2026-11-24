import http from 'http';

const PORT = 3005;

interface MockIncident {
  id: string;
  incidentId: string;
  bookingId: string;
  booking: {
    bookingCode: string;
    serviceType: string;
    customerId: string;
    status: string;
    completedAt: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
    };
    crew: {
      fullName: string;
      email: string;
      phone: string;
    };
  };
  reportedBy: {
    email: string;
    phone: string;
  };
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  type: string;
  description: string;
  evidenceUrls: string[];
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

let mockIncidents: MockIncident[] = [
  {
    id: 'inc-9001',
    incidentId: 'inc-9001',
    bookingId: 'bk-501',
    booking: {
      bookingCode: 'BK-501',
      serviceType: 'CHAUFFEUR',
      customerId: 'cust-101',
      status: 'COMPLETED',
      completedAt: '2026-11-23T14:30:00.000Z',
      customer: {
        firstName: 'Ananya',
        lastName: 'Gupta',
        email: 'ananya@example.com',
        phoneNumber: '+919811122334',
      },
      crew: {
        fullName: 'Rameshwar Pal',
        email: 'rameshwar@obcrew.com',
        phone: '+919876543210',
      },
    },
    reportedBy: {
      email: 'ananya@example.com',
      phone: '+919811122334',
    },
    status: 'OPEN',
    type: 'OVERCHARGING',
    description: 'Driver requested extra cash toll payment contrary to booked estimate.',
    evidenceUrls: ['https://example.com/receipt-photo.jpg'],
    adminNotes: null,
    resolvedAt: null,
    createdAt: '2026-11-23T15:00:00.000Z',
  },
  {
    id: 'inc-9002',
    incidentId: 'inc-9002',
    bookingId: 'bk-502',
    booking: {
      bookingCode: 'BK-502',
      serviceType: 'RSA_MECHANIC',
      customerId: 'cust-102',
      status: 'COMPLETED',
      completedAt: '2026-11-22T11:00:00.000Z',
      customer: {
        firstName: 'Sunil',
        lastName: 'Rawat',
        email: 'sunil@example.com',
        phoneNumber: '+919822233445',
      },
      crew: {
        fullName: 'Rajesh Sharma',
        email: 'rajesh@obcrew.com',
        phone: '+919876543211',
      },
    },
    reportedBy: {
      email: 'sunil@example.com',
      phone: '+919822233445',
    },
    status: 'UNDER_REVIEW',
    type: 'SERVICE_QUALITY',
    description: 'Jumpstart provided but battery terminals were left unfastened.',
    evidenceUrls: [],
    adminNotes: null,
    resolvedAt: null,
    createdAt: '2026-11-22T12:00:00.000Z',
  },
];

let mockVendors = [
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    userId: 'u-corp-01',
    companyName: 'Apex Chauffeur Fleet Services Pvt Ltd',
    contactPerson: 'Vikram Malhotra',
    gstin: '07AABCU9603R1ZM',
    panNumber: 'AABCU9603R',
    status: 'PENDING_VERIFICATION',
    commissionRate: '0.15',
    payoutBankAcc: '918273645521',
    payoutIfsc: 'HDFC0001234',
    rejectionReason: null as string | null,
    createdAt: '2026-11-20T10:00:00.000Z',
    documents: [
      {
        id: 'doc-001',
        docType: 'GST_CERTIFICATE',
        status: 'VERIFIED',
        updatedAt: '2026-11-20T11:00:00.000Z',
      },
      {
        id: 'doc-002',
        docType: 'COMPANY_PAN',
        status: 'PENDING',
        updatedAt: '2026-11-20T11:00:00.000Z',
      },
    ],
    members: [
      {
        id: 'member-01',
        inviteStatus: 'ACCEPTED',
        isActive: true,
        crewProfile: {
          id: 'crew-p1',
          fullName: 'Rameshwar Pal',
          serviceType: 'DRIVER',
          kycStatus: 'APPROVED',
          avgRating: 4.88,
        },
      },
      {
        id: 'member-02',
        inviteStatus: 'ACCEPTED',
        isActive: true,
        crewProfile: {
          id: 'crew-p2',
          fullName: 'Mohan Lal',
          serviceType: 'DRIVER',
          kycStatus: 'APPROVED',
          avgRating: 4.75,
        },
      },
    ],
    user: {
      email: 'vikram@apexchauffeurs.in',
      phoneNumber: '+919811122334',
    },
  },
];

let mockPendingCrewPayouts = [
  {
    crewProfileId: 'c1111111-1111-4000-8000-111111111111',
    fullName: 'Rajesh Sharma',
    email: 'rajesh@obcrew.com',
    phoneNumber: '+919876500001',
    pendingAmount: 3450.5,
    pendingJobs: 5,
    bankAccountMasked: '•••• •••• 9812',
  },
  {
    crewProfileId: 'c2222222-2222-4000-8000-222222222222',
    fullName: 'Sunil Kumar',
    email: 'sunil@obcrew.com',
    phoneNumber: '+919876500002',
    pendingAmount: 1200.0,
    pendingJobs: 2,
    bankAccountMasked: '•••• •••• 4421',
  },
];

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    let jsonBody: any = {};
    if (body) {
      try {
        jsonBody = JSON.parse(body);
      } catch {
        // Ignored
      }
    }

    res.setHeader('Content-Type', 'application/json');

    // 1. POST /auth/admin/login
    if (method === 'POST' && pathname === '/auth/admin/login') {
      if (jsonBody.email === 'admin@obcrew.com' && jsonBody.password === 'ObcrewAdmin2026!') {
        res.writeHead(201);
        res.end(
          JSON.stringify({
            success: true,
            message: 'Admin login successful.',
            accessToken: 'mock-valid-access-token-jwt-2026',
            refreshToken: 'mock-valid-refresh-token-jwt-2026',
            user: {
              id: 'admin-lead-01',
              email: 'admin@obcrew.com',
              firstName: 'Shiva',
              lastName: 'Ops',
              role: 'SUPER_ADMIN_OBCREW',
              phoneNumber: '+919800011111',
              isActive: true,
            },
          })
        );
        return;
      }

      res.writeHead(401);
      res.end(JSON.stringify({ message: 'Invalid email or password.' }));
      return;
    }

    // 2. POST /auth/refresh
    if (method === 'POST' && pathname === '/auth/refresh') {
      if (jsonBody.refreshToken) {
        res.writeHead(201);
        res.end(
          JSON.stringify({
            accessToken: 'mock-rotated-access-token-jwt-2026',
            refreshToken: 'mock-rotated-refresh-token-jwt-2026',
            user: {
              id: 'admin-lead-01',
              email: 'admin@obcrew.com',
              role: 'SUPER_ADMIN_OBCREW',
            },
          })
        );
        return;
      }
      res.writeHead(401);
      res.end(JSON.stringify({ message: 'Invalid refresh token.' }));
      return;
    }

    // 3. POST /auth/logout
    if (method === 'POST' && pathname === '/auth/logout') {
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
      return;
    }

    // 4. GET /admin/vendors/pending
    if (method === 'GET' && pathname === '/admin/vendors/pending') {
      res.writeHead(200);
      res.end(JSON.stringify(mockVendors));
      return;
    }

    // 5. GET /admin/vendors/:id/details
    if (method === 'GET' && pathname.startsWith('/admin/vendors/') && pathname.endsWith('/details')) {
      const parts = pathname.split('/');
      const id = parts[3];
      const vendor = mockVendors.find((v) => v.id === id);
      if (vendor) {
        res.writeHead(200);
        res.end(JSON.stringify(vendor));
        return;
      }
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Vendor profile not found.' }));
      return;
    }

    // 6. PATCH /admin/vendors/:id/verify
    if (method === 'PATCH' && pathname.startsWith('/admin/vendors/') && pathname.endsWith('/verify')) {
      const parts = pathname.split('/');
      const id = parts[3];
      const vendor = mockVendors.find((v) => v.id === id);
      if (!vendor) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Vendor not found' }));
        return;
      }

      if (jsonBody.status === 'REJECTED' && (!jsonBody.rejectionReason || !jsonBody.rejectionReason.trim())) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: 'rejectionReason is required when rejecting a vendor' }));
        return;
      }

      vendor.status = jsonBody.status;
      vendor.rejectionReason = jsonBody.rejectionReason || null;

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, vendor }));
      return;
    }

    // 7. GET /vendor/fleet/surveillance (VENDOR ONLY -> 403 Forbidden for admin)
    if (pathname === '/vendor/fleet/surveillance') {
      res.writeHead(403);
      res.end(
        JSON.stringify({
          message: 'Fleet surveillance is restricted to VENDOR sessions; this admin account cannot view the roster.',
        })
      );
      return;
    }

    // 8. POST /vendor/fleet/members (VENDOR ONLY -> 403 Forbidden for admin)
    if (method === 'POST' && pathname === '/vendor/fleet/members') {
      res.writeHead(403);
      res.end(
        JSON.stringify({
          message:
            'Platform Authorization Restriction (403): Driver fleet linking is strictly restricted to agency VENDOR sessions.',
        })
      );
      return;
    }

    // 9. GET /admin/crew/payouts/pending
    if (method === 'GET' && pathname === '/admin/crew/payouts/pending') {
      res.writeHead(200);
      res.end(JSON.stringify({ total: mockPendingCrewPayouts.length, crews: mockPendingCrewPayouts }));
      return;
    }

    // 10. POST /admin/crew/:id/mark-paid
    if (method === 'POST' && pathname.startsWith('/admin/crew/') && pathname.endsWith('/mark-paid')) {
      if (!jsonBody.periodStart || !jsonBody.periodEnd) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: 'periodStart and periodEnd are required ISO strings' }));
        return;
      }

      const parts = pathname.split('/');
      const crewProfileId = parts[3];

      mockPendingCrewPayouts = mockPendingCrewPayouts.filter((c) => c.crewProfileId !== crewProfileId);

      res.writeHead(201);
      res.end(
        JSON.stringify({
          success: true,
          payout: {
            id: 'payout-rec-' + Date.now(),
            amountPaid: 3450.5,
            jobsSettled: 5,
            referenceNote: jsonBody.referenceNote,
            paidAt: new Date().toISOString(),
          },
        })
      );
      return;
    }

    // 11. GET /admin/incidents
    if (method === 'GET' && pathname === '/admin/incidents') {
      const statusParam = parsedUrl.searchParams.get('status');
      let filtered = mockIncidents;
      if (statusParam && statusParam !== 'ALL') {
        filtered = filtered.filter((i) => i.status === statusParam);
      }

      res.writeHead(200);
      res.end(
        JSON.stringify({
          total: filtered.length,
          page: 1,
          limit: 10,
          totalPages: 1,
          incidents: filtered.map((i) => ({
            id: i.id,
            incidentId: i.id,
            bookingCode: i.booking.bookingCode,
            serviceType: i.booking.serviceType,
            type: i.type,
            status: i.status,
            reportedBy: i.reportedBy.email,
            createdAt: i.createdAt,
            updatedAt: i.createdAt,
          })),
        })
      );
      return;
    }

    // 12. GET /admin/incidents/:id
    if (method === 'GET' && pathname.startsWith('/admin/incidents/')) {
      const id = pathname.replace('/admin/incidents/', '');
      const incident = mockIncidents.find((i) => i.id === id);
      if (incident) {
        res.writeHead(200);
        res.end(JSON.stringify(incident));
        return;
      }
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Incident not found.' }));
      return;
    }

    // 13. POST /admin/incidents/:id/review
    if (method === 'POST' && pathname.startsWith('/admin/incidents/') && pathname.endsWith('/review')) {
      const id = pathname.split('/')[3];
      const incident = mockIncidents.find((i) => i.id === id);
      if (!incident) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Incident not found.' }));
        return;
      }
      if (incident.status !== 'OPEN') {
        res.writeHead(400);
        res.end(JSON.stringify({ message: `Only OPEN incidents can be moved to UNDER_REVIEW.` }));
        return;
      }
      incident.status = 'UNDER_REVIEW';
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, incidentId: incident.id, status: incident.status }));
      return;
    }

    // 14. POST /admin/incidents/:id/resolve
    if (method === 'POST' && pathname.startsWith('/admin/incidents/') && pathname.endsWith('/resolve')) {
      const id = pathname.split('/')[3];
      const incident = mockIncidents.find((i) => i.id === id);
      if (!incident) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Incident not found.' }));
        return;
      }
      if (!jsonBody.adminNotes || jsonBody.adminNotes.length < 5) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: 'adminNotes is required (min 5 chars).' }));
        return;
      }
      incident.status = 'RESOLVED';
      incident.adminNotes = jsonBody.adminNotes;
      incident.resolvedAt = new Date().toISOString();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, incidentId: incident.id, status: incident.status, resolvedAt: incident.resolvedAt }));
      return;
    }

    // 15. POST /admin/incidents/:id/dismiss
    if (method === 'POST' && pathname.startsWith('/admin/incidents/') && pathname.endsWith('/dismiss')) {
      const id = pathname.split('/')[3];
      const incident = mockIncidents.find((i) => i.id === id);
      if (!incident) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Incident not found.' }));
        return;
      }
      if (!jsonBody.adminNotes || jsonBody.adminNotes.length < 5) {
        res.writeHead(400);
        res.end(JSON.stringify({ message: 'adminNotes is required (min 5 chars).' }));
        return;
      }
      incident.status = 'DISMISSED';
      incident.adminNotes = jsonBody.adminNotes;
      incident.resolvedAt = new Date().toISOString();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, incidentId: incident.id, status: incident.status, resolvedAt: incident.resolvedAt }));
      return;
    }

    // Fallthrough: 404
    res.writeHead(404);
    res.end(JSON.stringify({ message: `Cannot ${method} ${pathname}` }));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock authoritative backend listening on http://127.0.0.1:${PORT}`);
});
