import { GeneratedContact } from '../types';

export const generateVCF = (contacts: GeneratedContact[]): string => {
  let vcfContent = '';

  contacts.forEach(contact => {
    vcfContent += 'BEGIN:VCARD\n';
    vcfContent += 'VERSION:3.0\n';
    vcfContent += `N:;${contact.name};;;\n`;
    vcfContent += `FN:${contact.name}\n`;
    vcfContent += `TEL;TYPE=CELL:${contact.number}\n`;
    vcfContent += 'END:VCARD\n';
  });

  return vcfContent;
};
