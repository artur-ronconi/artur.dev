import { PageHeader } from "@/components/admin/shell";
import { CertificationsManager } from "@/components/admin/certifications-manager";
import { getCertifications } from "@/server/modules/portfolio";

export default async function AdminCertificationsPage() {
  const certifications = await getCertifications(true);

  return (
    <>
      <PageHeader
        title="Certificações"
        description="Cadastre certificações técnicas com emissor, validade e link de verificação."
      />

      <CertificationsManager
        certifications={certifications.map((certification) => ({
          id: certification.id,
          name: certification.name,
          issuer: certification.issuer,
          issuedAt: certification.issuedAt ?? "",
          expiresAt: certification.expiresAt ?? "",
          credentialId: certification.credentialId ?? "",
          credentialUrl: certification.credentialUrl ?? "",
          iconSlug: certification.iconSlug ?? "",
          order: certification.order,
          visible: certification.visible,
        }))}
      />
    </>
  );
}
