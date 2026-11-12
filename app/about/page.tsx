import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About PayHalo — a simpler way to prepare your inheritance.",
  description:
    "PayHalo is building a simpler way for people to prepare their inheritance, from identifying what they own to recording who should receive it.",
};

export default function AboutPage() {
  return (
    <div className="paper min-h-screen">
      <header className="sticky top-0 z-30 bg-[#fcfbf7]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" aria-label="PayHalo home" className="font-[var(--font-display)] text-[21px] font-extrabold tracking-[-0.05em] text-[var(--color-forest)]">
            PayHalo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden text-[12.5px] font-medium text-[var(--color-ink)] sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-ink btn-sm">
              Create my plan
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto w-full max-w-[900px] px-4 pb-4 pt-14 text-center sm:px-8 sm:pt-20">
          <span className="eyebrow-pill">About PayHalo</span>
          <h1 className="display mt-6 text-[var(--color-ink)]">
            We have changed where we keep our wealth, but not how we <span className="italic text-[var(--color-forest)]">prepare to pass it on.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--color-muted)] sm:text-[15.5px]">
            PayHalo is building a simpler way for people to prepare their inheritance, from identifying what they own
            to recording who should receive it.
          </p>
        </section>

        <section className="mx-auto mt-10 w-full max-w-[1200px] px-4 sm:mt-14 sm:px-8">
          <div className="photo-frame relative h-[240px] sm:h-[360px]">
            <Image
              src="/about-light.jpg"
              alt="Light falling through green foliage"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2a24]/50 to-transparent" />
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-[1000px] px-4 sm:mt-24 sm:px-8">
          <span className="eyebrow-pill">The story</span>
          <h2 className="display-sm mt-5 max-w-[26ch] text-[var(--color-ink)]">
            An account can hold years of someone&rsquo;s work and still be invisible to the people closest to them.
          </h2>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 sm:gap-8">
            <p className="text-[14px] leading-relaxed text-[var(--color-muted)]">
              Think about someone who has spent years building an online business, receiving payments through digital
              platforms and accumulating savings and assets. Their family may know about some of these activities, but
              they may not know every platform involved, how much is held there or what the owner intended to happen
              to it.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--color-muted)]">
              If that person passes away, the family is left to piece together information that was never organized for
              them. They may have to search through devices, contact providers, submit documentation and work through
              procedures they have never encountered before.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--color-muted)]">
              The money and businesses may still exist, but knowing they exist is only one part of the problem. The
              family also needs to know what the owner wanted done with them.
            </p>
            <p className="text-[15px] font-medium leading-relaxed text-[var(--color-forest)]">
              PayHalo gives people a way to address both sides while they can still make those decisions themselves.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-[1200px] px-4 sm:mt-24 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[rgba(21,63,53,0.10)] bg-white/75 p-6 backdrop-blur sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)]">Our mission</p>
              <h3 className="display-xs mt-3 text-[var(--color-ink)]">Make inheritance planning practical for everyday people.</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                We&rsquo;re building tools that help people document their online wealth, choose their beneficiaries
                and establish a process for carrying out their intentions.
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-lime)] p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4d6b2a]">Our vision</p>
              <h3 className="display-xs mt-3 text-[var(--color-forest)]">
                A world where the things people build online don&rsquo;t become impossible to account for when
                they&rsquo;re gone.
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#3f5b3a]">
                We want digital inheritance planning to become a normal part of managing a financial life that
                increasingly exists online.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-[1200px] px-4 sm:mt-24 sm:px-8">
          <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,#17453a,#0f2f28)] px-6 py-14 text-center sm:px-12 sm:py-18">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(217,244,165,0.28),transparent_65%)]"
            />
            <h2 className="display-sm mx-auto max-w-[30ch] text-[#f4f8f2]">
              Your financial life has moved beyond physical documents and traditional accounts,{" "}
              <span className="italic text-[var(--color-lime)]">your inheritance arrangements can account for that too.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[13px] leading-relaxed text-[#b9d2c0]">
              Use PayHalo to prepare your digital inheritance.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Link
                href="/signup"
                className="btn w-full border-transparent bg-[var(--color-lime)] text-[var(--color-forest)] hover:bg-[#cdee93] sm:w-auto"
              >
                Get started <span aria-hidden>→</span>
              </Link>
              <Link href="/" className="btn btn-secondary w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-[rgba(21,63,53,0.10)] sm:mt-28">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-[var(--font-serif)] text-[15px] italic text-[var(--color-forest)]">
            Make your decisions while you can still make them.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--color-muted)]">
            <Link href="/">Home</Link>
            <Link href="/legal#privacy">Privacy Policy</Link>
            <Link href="/legal#terms">Terms of Service</Link>
            <Link href="/help">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
