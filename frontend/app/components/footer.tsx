import Link from "next/link";
import {
  Facebook,
  Instagram,
  MessageCircle,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import Logo from "./logo";
const AboutLinks = [
  { title: "How it works", href: "/how-it-works" },
  { title: "Featured", href: "/#popular" },
  { title: "Partnership", href: "/" },
  { title: "Business Relations", href: "/" },
];

const CommunityLinks = [
  { title: "Events", href: "/" },
  { title: "Blog", href: "/" },
  { title: "Podcast", href: "/" },
  { title: "Invite a friend", href: "/" },
];

const SocialsLinks = [
  { title: "Discord", href: "https://discord.com", Icon: MessageCircle },
  { title: "Instagram", href: "https://www.instagram.com", Icon: Instagram },
  { title: "Twitter", href: "https://twitter.com", Icon: Twitter },
  { title: "Facebook", href: "https://www.facebook.com", Icon: Facebook },
];

const linkClassName =
  "flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const FooterLinkColumn = ({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string; Icon?: LucideIcon }[];
}) => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      {links.map(({ title: label, href, Icon }) => {
        const isExternal = href.startsWith("http");

        return isExternal ? (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {Icon && <Icon aria-hidden="true" className="size-4" />}
            {label}
          </a>
        ) : (
          <Link key={label} href={href} className={linkClassName}>
            {Icon && <Icon aria-hidden="true" className="size-4" />}
            {label}
          </Link>
        );
      })}
    </div>
  );
};

export const Footer = () => {
  return (
    <footer className="mt-8 bg-muted">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <section>
            <Logo className="mb-4 text-xl" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground md:max-w-sm">
              Our vision is to provide convenience and help increase your sales
              business.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:gap-x-16">
            <FooterLinkColumn title="About" links={AboutLinks} />
            <FooterLinkColumn title="Community" links={CommunityLinks} />
            <FooterLinkColumn title="Socials" links={SocialsLinks} />
          </section>
        </div>

        <section className="mt-12 flex flex-col gap-4 text-sm font-medium text-muted-foreground md:mt-16 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Morent. All rights reserved.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
            <Link href="/" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/" className="transition-colors hover:text-foreground">
              Terms &amp; Conditions
            </Link>
          </div>
        </section>
      </div>
    </footer>
  );
};
