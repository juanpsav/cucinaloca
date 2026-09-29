import { describe, expect, it } from "vitest";
import { fetchPage, parseRecipeUrl } from "@/lib/fetch-page";

describe("parseRecipeUrl", () => {
  it("accepts normal pages and drops the fragment", () => {
    expect(parseRecipeUrl(" https://example.com/r?id=1#step-2 ").toString()).toBe("https://example.com/r?id=1");
  });
  it.each(["ftp://example.com/x", "file:///etc/passwd", "http://example.com:8080/", "http://127.0.0.1/", "http://[::1]/", "nope"])(
    "rejects %s",
    (u) => expect(() => parseRecipeUrl(u)).toThrow(),
  );
});

describe("fetchPage", () => {
  it("refuses hostnames that resolve to private addresses", async () => {
    await expect(fetchPage(new URL("http://localhost/"))).rejects.toMatchObject({ kind: "failed" });
  });
});
