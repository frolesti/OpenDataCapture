import fs from 'node:fs';
import path from 'node:path';

import { $CreatePendingInvestigatorData, $UpdatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { describe, expect, it } from 'vitest';

import { generateDoctorWelcomeEmail, validateDoctorWelcomeRecipient } from '../../../../../scripts/welcome-email';
import { renderWelcomeEmail } from '../welcome-email';

const template = fs.readFileSync(path.resolve(import.meta.dirname, '../../../public/mail-template.html'), 'utf8');
const recipient = {
  firstName: 'María',
  lastName: 'García Pérez',
  password: 'Example<&"$&',
  professionalTitle: 'Dra',
  username: 'mgarcia'
};

describe('investigator welcome email', () => {
  it.each([
    ['Dr', 'Estimado Dr. María García Pérez:'],
    ['Dra', 'Estimada Dra. María García Pérez:']
  ])('uses the explicit %s title and full name', (professionalTitle, greeting) => {
    const html = renderWelcomeEmail(template, { ...recipient, professionalTitle });
    expect(html).toContain(greeting);
    expect(html).not.toContain('{{');
    expect(html).not.toContain('Hola ');
    expect(html).toContain('https://altahealthdata.com/auth/login');
    expect(html).toContain('mailto:info@altamedicalservices.com');
  });

  it.each([undefined, null, '', 'Doctor', 'FEMALE'])('rejects missing or unconfirmed title %s', (professionalTitle) => {
    expect(() => renderWelcomeEmail(template, { ...recipient, professionalTitle })).toThrow('Dr. o Dra.');
  });

  it('escapes names and credentials without treating replacement tokens as HTML', () => {
    const html = renderWelcomeEmail(template, {
      ...recipient,
      firstName: '<script> & "María"',
      lastName: "O'Connor {{username}}",
      username: 'user<&'
    });
    expect(html).toContain('&lt;script&gt; &amp; &quot;María&quot; O&#39;Connor {{username}}');
    expect(html).toContain('Example&lt;&amp;&quot;$&amp;');
    expect(html).toContain('user&lt;&amp;');
    expect(html).not.toContain('<script>');
  });

  it.each(['firstName', 'lastName'])('rejects a missing %s', (key) => {
    expect(() => renderWelcomeEmail(template, { ...recipient, [key]: ' ' })).toThrow('nombre y los apellidos');
  });

  it('uses the same template and renderer for spreadsheet scripts', () => {
    expect(
      generateDoctorWelcomeEmail(
        { Nom: recipient.firstName, Cognoms: recipient.lastName, Tractament: 'Dra.' },
        recipient
      )
    ).toBe(renderWelcomeEmail(template, recipient));
    expect(() => validateDoctorWelcomeRecipient({ Nom: 'María', Cognoms: 'García' })).toThrow('Dr. o Dra.');
  });

  it('validates explicit titles on both create and update while accepting legacy missing values', () => {
    expect($UpdatePendingInvestigatorData.safeParse({ professionalTitle: 'Dra' }).success).toBe(true);
    expect($UpdatePendingInvestigatorData.safeParse({ professionalTitle: 'Dr' }).success).toBe(true);
    expect($UpdatePendingInvestigatorData.safeParse({ professionalTitle: null }).success).toBe(true);
    expect($UpdatePendingInvestigatorData.safeParse({}).success).toBe(true);
    expect($UpdatePendingInvestigatorData.safeParse({ professionalTitle: 'Doctor' }).success).toBe(false);
    expect($CreatePendingInvestigatorData.shape.professionalTitle.safeParse('Doctor').success).toBe(false);
  });
});
