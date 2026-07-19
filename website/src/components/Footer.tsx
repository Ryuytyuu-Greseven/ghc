import { LinkedinIcon, XIcon, InstagramIcon, WhatsAppIcon, DiscordIcon } from './BrandIcons'

const SOCIALS = [
  { name: 'LinkedIn', href: '#', Icon: LinkedinIcon },
  { name: 'X (Twitter)', href: '#', Icon: XIcon },
  { name: 'Instagram', href: '#', Icon: InstagramIcon },
  { name: 'WhatsApp', href: '#', Icon: WhatsAppIcon },
  { name: 'Discord', href: '#', Icon: DiscordIcon },
]

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterGroup {
  title: string
  links: FooterLink[]
}

const LINK_GROUPS: FooterGroup[] = [
  {
    title: 'Product',
    links: [
      { label: 'Why GHC', href: '#problem' },
      { label: 'Platform', href: '#features' },
      { label: 'Security', href: '#security' },
      { label: 'AI Assistant', href: '#ai' },
    ],
  },
  {
    title: 'Live App',
    links: [
      { label: 'SSO Portal', href: 'https://ghc-login.web.app', external: true },
      {
        label: 'Dashboard',
        href: 'https://project-3857994f-2565-4c14-9a7.web.app',
        external: true,
      },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact Us', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="GHC" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Government Health Connect
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Unified cloud platform for public healthcare administration — hospitals, staff,
              patients, and supply chains, in one place.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map(({ name, href, Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="text-sm text-slate-600 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-slate-200 pt-6 dark:border-slate-800">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Government Health Connect. Built for modernizing public
            healthcare administration.
          </p>
        </div>
      </div>
    </footer>
  )
}
