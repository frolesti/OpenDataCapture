export type WelcomeEmailData = {
  firstName: string;
  lastName: string;
  password: string;
  professionalTitle: string | null | undefined;
  username: string;
};

export function validateWelcomeEmailRecipient(
  data: Pick<WelcomeEmailData, 'firstName' | 'lastName' | 'professionalTitle'>
) {
  if (data.professionalTitle !== 'Dr' && data.professionalTitle !== 'Dra') {
    throw new Error('Seleccione explícitamente el tratamiento Dr. o Dra. antes de enviar las credenciales.');
  }
  if (!data.firstName.trim() || !data.lastName.trim()) {
    throw new Error('El correo de credenciales requiere el nombre y los apellidos del investigador.');
  }
}

export function renderWelcomeEmail(template: string, data: WelcomeEmailData) {
  validateWelcomeEmailRecipient(data);
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  const values = {
    greeting: `${data.professionalTitle === 'Dra' ? 'Estimada' : 'Estimado'} ${data.professionalTitle}. ${data.firstName.trim()} ${data.lastName.trim()}`,
    password: data.password,
    username: data.username
  };
  return template.replace(/\{\{(greeting|username|password)\}\}/g, (_match, key: keyof typeof values) =>
    escapeHtml(values[key])
  );
}
