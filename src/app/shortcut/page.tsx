import type { Metadata } from "next";
import { Code, InfoPage, StepItem, Steps } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "iPhone shortcut | Cucina Loca",
  description: "Open any recipe in Cucina Loca from the share sheet on your iPhone.",
};

export default function ShortcutPage() {
  return (
    <InfoPage
      eyebrow="iPhone & iPad"
      title="Cook from the share sheet"
      intro="Add a “Cook this” shortcut and you can open any recipe in Cucina Loca from the Share button."
    >
      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Set it up</h2>
        <Steps>
          <StepItem title="Open the Shortcuts app and tap +">Name the new shortcut “Cook this”.</StepItem>
          <StepItem title="Make it appear when you share">
            <p>
              Tap the <strong className="text-ink">ⓘ</strong> button and turn on <strong className="text-ink">Show in Share Sheet</strong>. At the top of the
              editor, set it to receive <strong className="text-ink">URLs</strong>.
            </p>
          </StepItem>
          <StepItem title="Add the action “Text”">
            <p>
              Type <Code>https://cucinaloca.com/</Code> and then insert the <strong className="text-ink">Shortcut Input</strong> variable right after it, with
              no space.
            </p>
          </StepItem>
          <StepItem title="Add the action “Open URLs”">It opens the Text from the previous step. That&apos;s it.</StepItem>
        </Steps>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Use it</h2>
        <p className="text-muted">
          On a recipe, tap Share, then <strong className="text-ink">Cook this</strong>. It opens in your default browser, which you can change in Settings →
          Chrome → Default Browser App.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Without the shortcut</h2>
        <p className="text-muted">
          Put <Code>cucinaloca.com/</Code> in front of any recipe&apos;s address. If a site won&apos;t open, add screenshots of the recipe instead.
        </p>
      </section>
    </InfoPage>
  );
}
