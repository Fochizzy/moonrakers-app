import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";

const ORIGINAL_ABOUT_URL = process.env.NEXT_PUBLIC_ABOUT_URL;
const ORIGINAL_PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL;

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(() => {
  restore("NEXT_PUBLIC_ABOUT_URL", ORIGINAL_ABOUT_URL);
  restore("NEXT_PUBLIC_PORTFOLIO_URL", ORIGINAL_PORTFOLIO_URL);
});

describe("SiteFooter", () => {
  it("prints the credit line and the affiliation disclaimer", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/Built by Izzy Hodnett with Claude/),
    ).toHaveTextContent("Built by Izzy Hodnett with Claude · About · Portfolio");
    expect(
      screen.getByText(
        "Unofficial fan tool. Not affiliated with IV Studio.",
      ),
    ).toBeInTheDocument();
  });

  it("links About and Portfolio out once their URLs are configured", () => {
    process.env.NEXT_PUBLIC_ABOUT_URL = "https://example.com/about";
    process.env.NEXT_PUBLIC_PORTFOLIO_URL = "https://example.com/work";

    render(<SiteFooter />);

    const about = screen.getByRole("link", { name: "About" });
    expect(about).toHaveAttribute("href", "https://example.com/about");
    expect(about).toHaveAttribute("target", "_blank");
    expect(about).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "href",
      "https://example.com/work",
    );
  });

  // The portfolio is still being built, so the word has to survive without a
  // destination rather than shipping as a link to nowhere.
  it("keeps an unconfigured label as plain text", () => {
    process.env.NEXT_PUBLIC_ABOUT_URL = "https://example.com/about";
    delete process.env.NEXT_PUBLIC_PORTFOLIO_URL;

    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Portfolio" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Built by Izzy Hodnett with Claude/),
    ).toHaveTextContent("Portfolio");
  });

  // A blank value is what an unset deployment variable actually looks like.
  it("treats a blank URL as unconfigured", () => {
    process.env.NEXT_PUBLIC_ABOUT_URL = "   ";

    render(<SiteFooter />);

    expect(
      screen.queryByRole("link", { name: "About" }),
    ).not.toBeInTheDocument();
  });
});
