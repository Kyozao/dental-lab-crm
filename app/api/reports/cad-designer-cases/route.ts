import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";

export async function GET(request: Request) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  // Only allow admins or managers to generate reports
  if (!["ADMIN", "MANAGER"].includes(appUser.role)) {
    return apiError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const { searchParams } = new URL(request.url);
  const designerId = searchParams.get("designerId");

  if (!designerId) {
    return apiError(400, "MISSING_DESIGNER_ID", "designerId query parameter is required.");
  }

  // Verify the designer exists and is a CAD_DESIGNER
  const designer = await prisma.user.findFirst({
    where: {
      id: designerId,
      role: "CAD_DESIGNER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!designer) {
    return apiError(404, "DESIGNER_NOT_FOUND", "CAD designer not found.");
  }

  // Fetch all cases for this designer
  const cases = await prisma.case.findMany({
    where: {
      cadDesignerId: designerId,
    },
    include: {
      clinic: {
        select: {
          name: true,
        },
      },
      serviceType: {
        select: {
          name: true,
        },
      },
      millings: {
        select: {
          teethMilledQty: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate totals
  const totalCases = cases.length;
  const totalTeethDesigned = cases.reduce((sum, c) => sum + (c.elementsQty || 0), 0);
  const totalTeethMilled = cases.reduce((sum, c) => sum + c.millings.reduce((mSum, m) => mSum + m.teethMilledQty, 0), 0);

  // Generate HTML for the report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CAD Designer Cases Report - ${designer.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .status-ENTRY { color: #666; }
    .status-DESIGNING { color: #007bff; }
    .status-DESIGN_READY { color: #28a745; }
    .status-DONE { color: #6c757d; }
  </style>
</head>
<body>
  <h1>CAD Designer Cases Report</h1>
  <div class="summary">
    <h2>Designer: ${designer.name}</h2>
    <p><strong>Total Cases:</strong> ${totalCases}</p>
    <p><strong>Total Teeth Designed:</strong> ${totalTeethDesigned}</p>
    <p><strong>Total Teeth Milled:</strong> ${totalTeethMilled}</p>
    <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Case Code</th>
        <th>Patient Name</th>
        <th>Clinic</th>
        <th>Service Type</th>
        <th>Status</th>
        <th>Teeth</th>
        <th>Elements Qty</th>
        <th>Teeth Milled</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      ${cases.map(c => `
        <tr>
          <td>${c.code}</td>
          <td>${c.patientName}</td>
          <td>${c.clinic?.name || ''}</td>
          <td>${c.serviceType?.name || ''}</td>
          <td class="status-${c.currentStatus}">${c.currentStatus}</td>
          <td>${c.teeth || ''}</td>
          <td>${c.elementsQty || ''}</td>
          <td>${c.millings.reduce((sum, m) => sum + m.teethMilledQty, 0)}</td>
          <td>${c.createdAt.toLocaleDateString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();

  // Return PDF as response
  return new Response(Buffer.from(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cad-designer-cases-${designer.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`
    }
  });
}