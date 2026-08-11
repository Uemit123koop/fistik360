import Link from "next/link";
import {
  corporateLinks,
  legalLastUpdated,
  legalLinks,
  type LegalDocument,
} from "@/lib/legal-content";

function DocumentNav() {
  return (
    <aside className="h-fit rounded-[20px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] lg:sticky lg:top-28">
      <nav aria-label="Kurumsal ve yasal sayfalar" className="grid gap-5">
        <div>
          <p className="data-label px-2">Kurumsal</p>
          <div className="mt-2 grid">
            {corporateLinks.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-11 content-center rounded-[10px] px-2 text-sm font-bold text-[var(--color-muted-text)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="data-label px-2">Yasal</p>
          <div className="mt-2 grid">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-11 content-center rounded-[10px] px-2 text-sm font-bold text-[var(--color-muted-text)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-14">
      <header className="max-w-4xl border-b border-[var(--color-border)] pb-8">
        <p className="eyebrow">{document.group}</p>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-[-0.035em] sm:text-5xl lg:text-6xl">{document.title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--color-muted-text)] sm:text-lg">{document.description}</p>
        <p className="mt-4 text-xs font-bold text-[var(--color-muted-text)]">Son güncelleme: {legalLastUpdated}</p>
      </header>

      <div className="mt-8 grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
        <DocumentNav />
        <article className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
          {document.notice && (
            <div className="mb-8 rounded-[16px] border border-[#decba7] bg-[#fff5df] p-4 text-sm font-semibold leading-6 text-[#684a1d]" role="note">
              {document.notice}
            </div>
          )}
          <div className="space-y-10">
            {document.sections.map((section) => (
              <section key={section.title} className="scroll-mt-28">
                <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--color-muted-text)] sm:text-base sm:leading-8">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 grid gap-3">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-7 text-[var(--color-muted-text)] sm:text-base">
                        <span aria-hidden="true" className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.facts && (
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {section.facts.map((fact) => (
                      <div key={fact.label} className="rounded-[14px] border border-[var(--color-border-soft)] bg-white p-4">
                        <dt className="data-label">{fact.label}</dt>
                        <dd className="mt-2 break-words text-sm font-bold leading-6 text-[var(--color-ink)]">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {section.links && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {section.links.map((link) => <Link key={link.href} href={link.href} className="button-secondary">{link.label}</Link>)}
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
