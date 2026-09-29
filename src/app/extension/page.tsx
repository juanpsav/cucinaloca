import type { Metadata } from "next";
import { Code, InfoPage, StepItem, Steps } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Chrome extension | Cucina Loca",
  description: "Cook the recipe you're looking at in Chrome's side panel.",
};

export default function ExtensionPage() {
  return (
    <InfoPage
      eyebrow="Chrome on your computer"
      title="Cook right next to the recipe"
      intro="Click the Cucina Loca icon on a recipe and it opens in Chrome's side panel, right next to the page. It works on sites that block other apps too, since it reads the page in your own browser."
    >
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Privacy</h2>
        <p className="text-muted">
          It only reads a page when you click the icon on it, and never runs in the background. Nothing is saved. Close the panel and it&apos;s gone.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Install</h2>
        <p className="text-muted">It&apos;s not in the Chrome Web Store yet. For now, you can load it from the source code.</p>
        <Steps>
          <StepItem title="Download the source">
            <p>
              Get the <a className="text-accent underline underline-offset-4" href="https://github.com/juanpsav/cucinaloca">code on GitHub</a> and unzip it.
            </p>
          </StepItem>
          <StepItem title="Open Chrome's extensions page">
            <p>
              Go to <Code>chrome://extensions</Code> and turn on <strong className="text-ink">Developer mode</strong> (top right).
            </p>
          </StepItem>
          <StepItem title="Load it">
            <p>
              Click <strong className="text-ink">Load unpacked</strong> and choose the <Code>extension</Code> folder. Pin the icon from the puzzle-piece menu.
            </p>
          </StepItem>
        </Steps>
      </section>
    </InfoPage>
  );
}
