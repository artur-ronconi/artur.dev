import { PageHeader } from "@/components/admin/shell";
import { HomeSectionsForm } from "@/components/admin/home-sections-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { getHomeSections, getSettings, getSocialLinks } from "@/server/modules/portfolio";

export default async function AdminPortfolioPage() {
  const [settings, sections, links] = await Promise.all([
    getSettings(),
    getHomeSections(),
    getSocialLinks(true),
  ]);

  return (
    <>
      <PageHeader
        title="Conteúdo do portfólio"
        description="Identidade, hero, sobre, contato, SEO e ordenação das seções da página inicial."
      />

      <div className="space-y-5">
        <SettingsForm
          initial={{
            fullName: settings.fullName,
            headline: settings.headline,
            heroBadge: settings.heroBadge ?? "",
            heroTitle: settings.heroTitle ?? "",
            heroHighlight: settings.heroHighlight ?? "",
            heroSubtitle: settings.heroSubtitle ?? "",
            heroDescription: settings.heroDescription ?? "",
            shortBio: settings.shortBio ?? "",
            about: settings.about ?? "",
            summaryItems: settings.summaryItems ?? [],
            avatarUrl: settings.avatarUrl,
            resumeUrl: settings.resumeUrl,
            email: settings.email ?? "",
            phone: settings.phone ?? "",
            location: settings.location ?? "",
            available: settings.available,
            availabilityNote: settings.availabilityNote ?? "",
            githubUrl: settings.githubUrl ?? "",
            linkedinUrl: settings.linkedinUrl ?? "",
            siteUrl: settings.siteUrl ?? "",
            metaTitle: settings.metaTitle ?? "",
            metaDescription: settings.metaDescription ?? "",
            ogImageUrl: settings.ogImageUrl,
            contactHeading: settings.contactHeading ?? "",
            contactText: settings.contactText ?? "",
            footerNote: settings.footerNote ?? "",
          }}
        />

        <HomeSectionsForm sections={sections} />

        <SocialLinksManager
          links={links.map((link) => ({
            id: link.id,
            label: link.label,
            url: link.url,
            iconSlug: link.iconSlug ?? "",
            order: link.order,
            visible: link.visible,
          }))}
        />
      </div>
    </>
  );
}
