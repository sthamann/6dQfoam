import { promises as fs } from "fs";
import path from "path";
import { storage } from "../core/storage";

export async function generateMarkdownReport(
  testName: string,
  data: any,
): Promise<string> {
  try {
    const activeSession = await storage.getActiveSession();
    const sessionId = activeSession?.id || "unknown";

    // Load template
    const templatePath = path.join(
      process.cwd(),
      "server/computations",
      testName.replace("_", "-"),
      "template.md",
    );
    let template: string;

    try {
      template = await fs.readFile(templatePath, "utf8");
    } catch {
      // Fallback to default template if specific template doesn't exist
      template = await getDefaultTemplate(testName);
    }

    // Get current equation and relativity data
    const coeffs = [0, 0, 0, 0, 0]; // Default coefficients
    const relat = { lorentzEpsilon: "N/A", newtonConstant: "N/A" }; // Default relativity

    // Replace template variables
    const markdown = template
      .replace(/{{sessionId}}/g, sessionId)
      .replace(/{{c_tt}}/g, String(coeffs[0] || 0))
      .replace(/{{c_xx}}/g, String(coeffs[1] || 0))
      .replace(/{{c_yy}}/g, String(coeffs[2] || 0))
      .replace(/{{c_zz}}/g, String(coeffs[3] || 0))
      .replace(/{{c_xy}}/g, String(coeffs[4] || 0))
      .replace(/{{lorentzEpsilon}}/g, String(relat?.lorentzEpsilon ?? "N/A"))
      .replace(/{{newtonConstant}}/g, String(relat?.newtonConstant ?? "N/A"))
      .replace(/{{timestamp}}/g, new Date().toISOString())
      .replace(/{{result}}/g, JSON.stringify(data.result || data, null, 2))
      .replace(/{{runtime}}/g, String(data.runtime || 0))
      .replace(/{{reps}}/g, formatReps(data.reps))
      .replace(/{{operators}}/g, formatOperators(data.operators))
      .replace(/{{generations}}/g, String(data.generations || 1));

    // Write to docs directory
    const docsDir = path.join(process.cwd(), "docs", sessionId);
    await fs.mkdir(docsDir, { recursive: true });

    const filePath = path.join(docsDir, `${testName}.md`);
    await fs.writeFile(filePath, markdown);

    return filePath;
  } catch (error) {
    console.error("Error generating markdown report:", error);
    throw error;
  }
}

function formatReps(reps: any[]): string {
  if (!Array.isArray(reps)) return "No representations provided";

  return reps
    .map(
      (rep, i) =>
        `- Rep ${i + 1}: ${rep.group || rep.su3}(${rep.dim || rep.su2}) with Dynkin=${rep.dynkin || rep.u1}, Q_U1=${rep.q_u1 || rep.u1}, chirality=${rep.chirality}`,
    )
    .join("\n");
}

function formatOperators(operators: any[]): string {
  if (!Array.isArray(operators)) return "No operators provided";

  return operators
    .map((op, i) => `- ${op.name}: ${op.coeff || op.coefficient}`)
    .join("\n");
}

function getDefaultTemplate(testName: string): string {
  return `# ${testName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} - Session \`{{sessionId}}\`

**Field equation coefficients**

\`\`\`text
c_tt = {{c_tt}}
c_xx = {{c_xx}}
c_yy = {{c_yy}}
c_zz = {{c_zz}}
c_xy = {{c_xy}}
\`\`\`

**Relativity (Tab 2) results**

\`\`\`text
ε  = {{lorentzEpsilon}}
G₄ = {{newtonConstant}}
\`\`\`

---

## Test Results

\`\`\`json
{{result}}
\`\`\`

**Performance**: Runtime {{runtime}}ms

Generated at: {{timestamp}}`;
}
