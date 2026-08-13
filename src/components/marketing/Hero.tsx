import QRCode from "qrcode";
import { ButtonLink } from "@/components/ui/Button";
import { PhoneMock } from "./PhoneMock";

const DEMO_URL = "https://tablet.app/r/kesar-tandoor/t/A7X29K";

async function heroQr() {
  const svg = await QRCode.toString(DEMO_URL, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  return svg
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/\swidth="\d+"/, "")
    .replace(/\sheight="\d+"/, "")
    .replace(/#000000/gi, "currentColor")
    .replace(/fill="#ffffff"/gi, 'fill="none"')
    .trim();
}

const PROOF = [
  { value: "1.8s", label: "to menu" },
  { value: "0", label: "installs" },
  { value: "100%", label: "tables reporting" },
];

export async function Hero() {
  const qrSvg = await heroQr();

  return (
    <section className="shell pt-10 pb-12 sm:pt-14 sm:pb-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div>
          <span className="eyebrow inline-flex items-center gap-2 text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            QR ordering + back office
          </span>

          <h1 className="display mt-4 text-[2rem] sm:text-[2.75rem] lg:text-[3.125rem]">
            Every table becomes a <span className="text-brand">counter</span>.
          </h1>

          <p className="measure mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
            Guests scan the code on their table, browse the real menu and order
            from their own phone. You get the order, the table number and the
            head count the moment they tap send.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <ButtonLink href="/auth?mode=register">Create account</ButtonLink>
            <ButtonLink href="#surfaces" variant="secondary">
              See how it works
            </ButtonLink>
          </div>

          {/* Proof runs inline on one row, never as a stacked list. */}
          <dl className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-5">
            {PROOF.map((p) => (
              <div key={p.label} className="flex items-baseline gap-1.5">
                <dt className="num text-base font-semibold text-ink">{p.value}</dt>
                <dd className="text-xs text-ink-3">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual sits inline beside the copy, centred on narrow screens. */}
        <div className="flex items-center justify-center gap-4 sm:gap-5 lg:justify-end">
          <div className="hidden shrink-0 rounded-xl border border-line p-3 sm:block">
            <div className="relative overflow-hidden rounded bg-white p-2">
              <div
                className="size-16 text-ink sm:size-20 [&_svg]:size-full"
                role="img"
                aria-label="QR code for table 12"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div
                aria-hidden="true"
                className="anim-sweep absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-brand/20 to-transparent"
              />
            </div>
            <p className="num mt-2 text-center text-[0.5625rem] tracking-wider text-ink-3">
              TABLE 12
            </p>
          </div>

          <PhoneMock />
        </div>
      </div>
    </section>
  );
}
