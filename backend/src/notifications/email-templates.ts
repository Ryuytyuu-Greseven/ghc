const BRAND = {
  saffron: '#FF9933',
  green: '#138808',
  teal: '#0d9488',
  tealDark: '#0f766e',
  cream: '#FAF9F6',
  slate: '#334155',
  slateMuted: '#64748b',
  white: '#ffffff',
};

const DEFAULT_LOGO_URL = process.env.API_BASE_URL?.trim()
  ? `${process.env.API_BASE_URL.replace(/\/$/, '')}/email-assets/logo-email.png`
  : 'https://ghc-login.web.app/logo-email.png';

function getLogoUrl(): string {
  return process.env.EMAIL_LOGO_URL?.trim() || DEFAULT_LOGO_URL;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type EmailLayoutOptions = {
  title: string;
  preheader: string;
  accentColor: string;
  badgeLabel: string;
  bodyHtml: string;
};

function wrapEmailLayout(options: EmailLayoutOptions): string {
  const { title, preheader, accentColor, badgeLabel, bodyHtml } = options;
  const logoUrl = escapeHtml(getLogoUrl());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:${BRAND.slate};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f7;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:${BRAND.white};border:1px solid #e2e8f0;">
          <tr>
            <td width="33%" height="5" style="background:${BRAND.saffron};font-size:0;line-height:0;">&nbsp;</td>
            <td width="34%" height="5" style="background:${BRAND.white};font-size:0;line-height:0;">&nbsp;</td>
            <td width="33%" height="5" style="background:${BRAND.green};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td colspan="3" align="center" style="padding:28px 24px 18px;background:${BRAND.cream};border-bottom:1px solid #e2e8f0;">
              <img src="${logoUrl}" alt="Government Health Connect" width="80" height="80" style="display:block;margin:0 auto 12px;border:0;outline:none;text-decoration:none;" />
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.slateMuted};">Government Health Connect</div>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="padding:24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:6px 12px;background-color:${accentColor};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(badgeLabel)}</td>
                </tr>
              </table>
              <h1 style="margin:16px 0 12px;font-size:22px;line-height:1.35;color:${BRAND.slate};font-weight:700;">${escapeHtml(title)}</h1>
              <div style="font-size:15px;line-height:1.65;color:${BRAND.slate};">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td colspan="3" align="center" style="padding:18px 24px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:13px;color:${BRAND.slateMuted};">Thank you for trusting Government Health Connect.</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">Automated notification — please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoCard(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0;">
    <tr>
      <td style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.slateMuted};margin-bottom:4px;">${escapeHtml(label)}</div>
        <div style="font-size:15px;font-weight:600;color:${BRAND.slate};">${escapeHtml(value)}</div>
      </td>
    </tr>
  </table>`;
}

export function patientOnboardedTemplate(
  patientName: string,
  facilityName: string,
): string {
  return wrapEmailLayout({
    title: 'Welcome — Registration Successful',
    preheader: `You have been successfully onboarded at ${facilityName}.`,
    accentColor: BRAND.green,
    badgeLabel: 'Patient Onboarding',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear <strong>${escapeHtml(patientName)}</strong>,</p>
      <p style="margin:0 0 12px;">You have been successfully onboarded at <strong>${escapeHtml(facilityName)}</strong>.</p>
      ${infoCard('Status', 'Registration complete')}
      <p style="margin:12px 0 0;">Our care team will be in touch if any further steps are needed.</p>
    `,
  });
}

export function doctorAssignedPatientTemplate(
  patientName: string,
  doctorName: string,
): string {
  return wrapEmailLayout({
    title: 'Your Doctor Has Been Assigned',
    preheader: `${doctorName} has been assigned to your care.`,
    accentColor: BRAND.teal,
    badgeLabel: 'Care Assignment',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear <strong>${escapeHtml(patientName)}</strong>,</p>
      <p style="margin:0 0 12px;">A doctor has been assigned to support your care.</p>
      ${infoCard('Assigned Doctor', doctorName)}
      <p style="margin:12px 0 0;">If you have questions, please contact your hospital.</p>
    `,
  });
}

export function doctorAssignedDoctorTemplate(
  doctorName: string,
  patientName: string,
  problem: string,
  visitDate: string,
): string {
  return wrapEmailLayout({
    title: 'New Patient Assigned to You',
    preheader: `Patient ${patientName} has been assigned to you.`,
    accentColor: BRAND.saffron,
    badgeLabel: 'Doctor Alert',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear <strong>${escapeHtml(doctorName)}</strong>,</p>
      <p style="margin:0 0 12px;">A new patient has been assigned to you for an upcoming visit.</p>
      ${infoCard('Patient', patientName)}
      ${infoCard('Visit Reason', problem)}
      ${infoCard('Visit Date', visitDate)}
      <p style="margin:12px 0 0;">Please log in to the GHC portal to review the patient details.</p>
    `,
  });
}

export function medicinesAssignedTemplate(
  patientName: string,
  visitDate: string,
  doctorName: string | undefined,
  medicines: { name: string; quantity: number }[],
): string {
  const rows = medicines
    .map(
      (
        m,
        index,
      ) => `<tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:${BRAND.slate};">${escapeHtml(m.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:${BRAND.tealDark};font-weight:700;text-align:center;">${m.quantity}</td>
        </tr>`,
    )
    .join('');

  const doctorBlock = doctorName
    ? infoCard('Prescribing Doctor', doctorName)
    : '';

  return wrapEmailLayout({
    title: 'Your Prescribed Medicines',
    preheader: `Medicines prescribed for your visit on ${visitDate}.`,
    accentColor: BRAND.tealDark,
    badgeLabel: 'Prescription',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear <strong>${escapeHtml(patientName)}</strong>,</p>
      <p style="margin:0 0 12px;">Medicines prescribed for your visit on <strong>${escapeHtml(visitDate)}</strong>:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;margin:0 0 12px;">
        <tr style="background:${BRAND.tealDark};">
          <th align="left" style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#ffffff;">Medicine</th>
          <th align="center" style="padding:10px 12px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#ffffff;">Qty</th>
        </tr>
        ${rows}
      </table>
      ${doctorBlock}
      <p style="margin:12px 0 0;">Please follow your doctor's instructions.</p>
    `,
  });
}

export function hospitalOnboardedTemplate(hospitalName: string, type: string, city: string): string {
  return wrapEmailLayout({
    title: 'Welcome to GHC — Registration Successful',
    preheader: `Facility "${hospitalName}" has been successfully onboarded.`,
    accentColor: BRAND.green,
    badgeLabel: 'Hospital Onboarding',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear Administrator,</p>
      <p style="margin:0 0 12px;">Your facility <strong>${escapeHtml(hospitalName)}</strong> (${escapeHtml(type)}) has been successfully onboarded in <strong>${escapeHtml(city)}</strong>.</p>
      ${infoCard('Status', 'Active / Registered')}
      <p style="margin:12px 0 0;">Please log in to the GHC portal to configure your departments and staff.</p>
    `,
  });
}

export function hospitalUpdatedTemplate(hospitalName: string, changes: string): string {
  return wrapEmailLayout({
    title: 'Facility Profile Updated — GHC',
    preheader: `Profile details for "${hospitalName}" have been updated.`,
    accentColor: BRAND.teal,
    badgeLabel: 'Facility Profile Update',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear Administrator,</p>
      <p style="margin:0 0 12px;">The profile details for your facility <strong>${escapeHtml(hospitalName)}</strong> have been updated.</p>
      ${infoCard('Profile Update', changes)}
      <p style="margin:12px 0 0;">Review these updates in the GHC Portal management screen.</p>
    `,
  });
}

export function staffAccountCreatedTemplate(name: string, username: string, password?: string): string {
  const pwdBlock = password ? infoCard('Initial Password', password) : '';
  return wrapEmailLayout({
    title: 'Your GHC Staff Account Credentials',
    preheader: `Your account on GHC has been created.`,
    accentColor: BRAND.teal,
    badgeLabel: 'Account Registration',
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 12px;">Your staff account on Government Health Connect (GHC) has been successfully created by the administrator.</p>
      <p style="margin:0 0 12px;">You can use the following credentials to log in to the portal:</p>
      ${infoCard('Username', username)}
      ${pwdBlock}
      <p style="margin:12px 0 0;">For security reasons, we strongly recommend that you log in and update your password immediately after your first access.</p>
    `,
  });
}
