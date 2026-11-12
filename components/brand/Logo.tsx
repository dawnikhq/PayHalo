import Image from "next/image";

/**
 * The supplied lockup, not a redrawing of it: the ribbon mark and the wordmark
 * were lifted from the brand sheet, so the site and the deck cannot drift apart.
 * Height is the only dial — the aspect ratio is fixed at 1368×261.
 */

const RATIO = 1368 / 261;

export function Logo({
  height = 28,
  priority = false,
  className = "",
}: {
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/payhalo-lockup.png"
      alt="PayHalo"
      width={1368}
      height={261}
      priority={priority}
      sizes={`${Math.round(height * RATIO)}px`}
      style={{ height, width: "auto" }}
      className={className}
    />
  );
}

/** The mark on its own, for the tight corners: the app rail, the favicon strip. */
export function Mark({ height = 26, className = "" }: { height?: number; className?: string }) {
  return (
    <Image
      src="/brand/payhalo-mark.png"
      alt="PayHalo"
      width={592}
      height={348}
      sizes={`${Math.round(height * (592 / 348))}px`}
      style={{ height, width: "auto" }}
      className={className}
    />
  );
}
