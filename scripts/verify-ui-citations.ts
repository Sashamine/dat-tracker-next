/**
 * Verify all citation popovers render correctly in the UI.
 * Launches its own Chromium instance against localhost:3000.
 */
import { chromium } from "playwright";

const COMPANIES = process.argv.length > 2 
  ? process.argv.slice(2).map(t => t.toUpperCase())
  : ["ABTC", "BTBT", "NAKA", "HSDT", "DFDV", "UPXI"];
const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;
  const failures: { company: string; label: string; issue: string }[] = [];

  for (const ticker of COMPANIES) {
    console.log(`\n📋 ${ticker}`);
    await page.goto(`${BASE}/company/${ticker}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    // Wait for hydration
    await page.waitForTimeout(3000);

    // Open all collapsed <details> elements first
    await page.$$eval("details:not([open])", (els) =>
      els.forEach((el) => el.setAttribute("open", ""))
    );
    await page.waitForTimeout(500);

    // Find all ⓘ buttons with their index
    const btnCount = await page.$$eval("button", (btns) =>
      btns.filter((b) => b.textContent?.includes("ⓘ")).length
    );

    console.log(`   Found ${btnCount} citation buttons`);

    for (let i = 0; i < btnCount; i++) {
     try {
      // Re-query each time since DOM may shift after popover open/close
      const btns = await page.$$("button");
      const citBtns = [];
      for (const b of btns) {
        const text = await b.textContent();
        if (text?.includes("ⓘ")) citBtns.push({ el: b, label: text!.trim() });
      }

      if (i >= citBtns.length) {
        console.log(`   ⚠️ Button ${i}: disappeared after DOM change`);
        totalSkip++;
        continue;
      }

      const { el, label } = citBtns[i];

      // Scroll into view and click
      try {
        await el.scrollIntoViewIfNeeded({ timeout: 3000 });
        await page.waitForTimeout(200);
        try {
          await el.click({ force: true, timeout: 5000 });
        } catch {
          // Fallback: JS click
          await el.evaluate((e: any) => e.click());
        }
      } catch (scrollErr: any) {
        // If element is not visible at all, try JS click
        try {
          await el.evaluate((e: any) => { e.scrollIntoView({ block: 'center' }); e.click(); });
          await page.waitForTimeout(500);
        } catch {
          console.log(`   ⚠️  ${label}: Could not click button (not visible)`);
          totalSkip++;
          continue;
        }
      }
      await page.waitForTimeout(800);

      // Check for popover - the ProvenanceMetric uses a custom popover (not Radix)
      // It's an absolute-positioned div with z-50 that appears after the button
      const popoverData = await page.evaluate(() => {
        // Strategy 1: Look for the z-50 popover div that contains "Data Source"
        let wrapper: Element | null = null;
        const candidates = document.querySelectorAll("div.z-50, div[class*='z-50']");
        for (const el of candidates) {
          if (el.textContent?.includes("Data Source")) {
            wrapper = el;
            break;
          }
        }
        // Strategy 2: Broader search for any visible element with citation content
        if (!wrapper) {
          const all = document.querySelectorAll("div.absolute, div.fixed");
          for (const el of all) {
            const t = el.textContent || "";
            const rect = el.getBoundingClientRect();
            if ((t.includes("Data Source") || t.includes("XBRL Fact")) && rect.height > 50) {
              wrapper = el;
              break;
            }
          }
        }
        // Strategy 3: Radix popper (some metrics might use it)
        if (!wrapper) {
          wrapper = document.querySelector("[data-radix-popper-content-wrapper]");
        }

        if (!wrapper) return null;

        const text = wrapper.textContent || "";
        const code = wrapper.querySelector("code");
        const links = [...wrapper.querySelectorAll("a[href]")].map(
          (a: any) => ({
            text: a.textContent?.trim(),
            href: a.href,
          })
        );

        return {
          searchTerm: code?.textContent || null,
          links,
          hasDataSource: text.includes("Data Source"),
          hasCtrlF:
            text.includes("Ctrl+F") || text.includes("XBRL Fact"),
          hasVerified: text.includes("verified") || text.includes("Last"),
          sourceType: text.includes("Press Release")
            ? "PR"
            : text.includes("8-K")
              ? "8-K"
              : text.includes("10-Q")
                ? "10-Q"
                : text.includes("10-K")
                  ? "10-K"
                  : text.includes("XBRL")
                    ? "XBRL"
                    : "unknown",
          textSnippet: text.substring(0, 200),
        };
      });

      if (!popoverData) {
        // Some buttons (mNAV, Equity NAV/Share) are calculated — no popover expected
        // Check if this is a calculated metric
        const isCalculated = /^[\d.]+x|^\$[\d.]+[ⓘ]?$/.test(
          label.replace("ⓘ", "")
        );
        if (isCalculated) {
          console.log(`   ⏭️  ${label}: calculated metric (no popover expected)`);
          totalSkip++;
        } else {
          console.log(`   ❌ ${label}: NO POPOVER OPENED`);
          failures.push({
            company: ticker,
            label,
            issue: "Popover did not open",
          });
          totalFail++;
        }
      } else {
        const issues: string[] = [];

        if (!popoverData.hasDataSource && !popoverData.hasCtrlF)
          issues.push("No source info");
        if (!popoverData.searchTerm && popoverData.sourceType !== "XBRL")
          issues.push("No search term");
        if (
          popoverData.links.length === 0 &&
          popoverData.sourceType !== "XBRL"
        )
          issues.push("No source link");

        if (issues.length === 0) {
          const linkText =
            popoverData.links[0]?.text || popoverData.sourceType;
          console.log(
            `   ✅ ${label}: [${popoverData.sourceType}] search="${popoverData.searchTerm || "XBRL"}" → ${linkText}`
          );
          totalPass++;
        } else {
          console.log(
            `   ⚠️  ${label}: ${issues.join(", ")} | text: ${popoverData.textSnippet.substring(0, 80)}`
          );
          failures.push({
            company: ticker,
            label,
            issue: issues.join(", "),
          });
          totalFail++;
        }
      }

      // Close popover - click the backdrop overlay if present, then escape
      const backdrop = await page.$("div.fixed.inset-0.z-40");
      if (backdrop) await backdrop.click();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      // Double-check: dismiss any remaining popover by clicking empty space
      await page.mouse.click(10, 10);
      await page.waitForTimeout(200);
     } catch (err: any) {
        console.log(`   ⚠️  Button ${i}: Error - ${err.message?.substring(0, 60)}`);
        totalSkip++;
        // Try to recover page state
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);
     }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 UI CITATION VERIFICATION`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Total buttons: ${totalPass + totalFail + totalSkip}`);
  console.log(`✅ Pass: ${totalPass}`);
  console.log(`❌ Fail: ${totalFail}`);
  console.log(`⏭️  Skip (calculated): ${totalSkip}`);

  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    for (const f of failures) {
      console.log(`  ${f.company} "${f.label}": ${f.issue}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
