import type { Metadata } from "next";
import { Code, InfoPage, StepItem, Steps } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "iPhone shortcut — Cucina Loca",
  description: "Open any recipe in Cucina Loca from the share sheet on your iPhone.",
};

export default function ShortcutPage() {
  return (
    <InfoPage
      eyebrow="iPhone & iPad"
      title="Cook from the share sheet"
      intro="Add a “Cook this” shortcut once, and any recipe you're reading in Chrome or Safari opens in Cucina Loca with two taps: Share, then Cook this."
    >
      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Set it up (about a minute)</h2>
        <Steps>
          <StepItem title="Open the Shortcuts app and tap +">Name the new shortcut “Cook this”.</StepItem>
          <StepItem title="Make it appear when you share">
            <p>
              Tap the <strong className="text-ink">ⓘ</strong> button and turn on <strong className="text-ink">Show in Share Sheet</strong>. At the top of the
              editor, set it to receive <strong className="text-ink">URLs</strong>.
            </p>
          </StepItem>
          <StepItem title="Add the action “URL Encode”">It encodes the Shortcut Input (the recipe&apos;s address).</StepItem>
          <StepItem title="Add the action “Text”">
            <p>
              Type <Code>https://cucinaloca.com/cook?url=</Code> and then insert the <strong className="text-ink">URL Encoded Text</strong> variable right after
              it, with no space.
            </p>
          </StepItem>
          <StepItem title="Add the action “Open URLs”">It opens the Text from the previous step.</StepItem>
        </Steps>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Use it</h2>
        <p className="text-muted">
          On a recipe, tap Share (in Chrome it&apos;s in the address bar menu), then <strong className="text-ink">Cook this</strong>. The recipe opens in your
          default browser. To use Chrome, set it in Settings → Chrome → Default Browser App.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">No shortcut? No problem</h2>
        <p className="text-muted">
          Put <Code>cucinaloca.com/</Code> in front of any recipe&apos;s address. If a site doesn&apos;t let Cucina Loca read it, take screenshots of the
          recipe and add them instead.
        </p>
      </section>
    </InfoPage>
  );
}
